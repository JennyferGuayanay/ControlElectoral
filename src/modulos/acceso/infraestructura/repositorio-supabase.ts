import { FunctionsHttpError, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

import { crearSupabaseRecuperacion, obtenerSupabase } from '@/infraestructura/supabase';

import type { RecuperacionVerificada, RepositorioAcceso, Sesion } from '../aplicacion/acceso';
import { esquemaPerfil, type Perfil } from '../dominio/acceso';
import { borrarPerfilSinConexion, guardarPerfilSinConexion, leerPerfilSinConexion } from './perfil-sin-conexion';

const camposPerfil = 'usuario_id,nombres,apellidos,correo,provincia_id,rol_codigo,activo,cambio_clave_pendiente,correo_verificado_en';

type ErrorSupabase = { code?: string; status?: number };

function fallo(error: ErrorSupabase, alternativa: string) {
  switch (error.code) {
    case 'invalid_credentials':
      return new Error('El correo o la contraseña no son correctos.');
    case 'user_banned':
      return new Error('Tu cuenta está deshabilitada. Contacta a tu coordinador.');
    case 'otp_expired':
    case 'bad_otp':
      return new Error('El código es incorrecto o venció. Puedes pedir otro.');
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return new Error('Espera un momento antes de volver a intentarlo.');
    case 'same_password':
      return new Error('Usa una contraseña distinta de la actual.');
    case 'weak_password':
      return new Error('La contraseña es débil. Usa una combinación más larga y difícil de adivinar.');
    case 'reauthentication_needed':
      return new Error('Verifica de nuevo tu identidad antes de cambiar la contraseña.');
    default:
      return new Error(error.status === 429 ? 'Espera un momento antes de volver a intentarlo.' : alternativa);
  }
}

function identidad(sesion: Session | null): Sesion | null {
  return sesion ? { usuarioId: sesion.user.id, token: sesion.access_token, expiraEn: (sesion.expires_at ?? 0) * 1_000 } : null;
}

async function consultarPerfil(cliente: SupabaseClient, usuarioId: string): Promise<Perfil | null> {
  const { data, error } = await cliente
    .from('perfiles')
    .select(camposPerfil)
    .eq('usuario_id', usuarioId)
    .maybeSingle();

  if (error) throw fallo(error, 'No pudimos comprobar los permisos. Revisa tu conexión.');
  return data ? esquemaPerfil.parse(data) : null;
}

async function cambiarTemporal(cliente: SupabaseClient, sesion: Sesion, clave: string) {
  const { error } = await cliente.functions.invoke('cambiar-clave-temporal', {
    headers: { Authorization: `Bearer ${sesion.token}` },
    body: { clave_nueva: clave },
  });
  if (!error) return;

  if (error instanceof FunctionsHttpError) {
    const respuesta = error.context as Response;
    if (respuesta.status === 401 || respuesta.status === 403) {
      throw new Error('Vuelve a verificar tu acceso para cambiar la contraseña.');
    }

    const datos: unknown = await respuesta.json().catch(() => null);
    if (datos && typeof datos === 'object' && 'mensaje' in datos && typeof datos.mensaje === 'string') {
      throw new Error(datos.mensaje);
    }
  }

  throw new Error('No pudimos cambiar la contraseña. Revisa tu conexión e inténtalo de nuevo.');
}

async function tieneOtpReciente(sesion: Sesion) {
  const { data, error } = await obtenerSupabase().auth.getClaims(sesion.token);
  if (error) throw fallo(error, 'No pudimos comprobar el código. Inténtalo de nuevo.');

  const ahora = Date.now() / 1000;
  return (data?.claims.amr ?? []).some((metodo) => typeof metodo !== 'string'
    && (metodo.method === 'otp' || metodo.method === 'recovery')
    && metodo.timestamp <= ahora
    && ahora - metodo.timestamp <= 600);
}

function observarSesion(notificar: (sesion: Sesion | null) => void) {
  const { data } = obtenerSupabase().auth.onAuthStateChange((_evento, sesion) => {
    notificar(identidad(sesion));
  });

  return () => data.subscription.unsubscribe();
}

async function iniciarSesion(correo: string, clave: string) {
  const { error } = await obtenerSupabase().auth.signInWithPassword({ email: correo, password: clave });
  if (error) throw fallo(error, 'No pudimos iniciar sesión. Revisa tu conexión.');
}

async function cerrarSesion() {
  const { error } = await obtenerSupabase().auth.signOut({ scope: 'local' });
  if (error) throw fallo(error, 'No se pudo cerrar la sesión. Revisa tu conexión e inténtalo de nuevo.');
  await borrarPerfilSinConexion().catch(() => undefined);
}

async function enviarCodigoCorreo(correo: string) {
  const { error } = await obtenerSupabase().auth.signInWithOtp({
    email: correo,
    options: { shouldCreateUser: false },
  });
  if (error) throw fallo(error, 'No pudimos enviar el código. Inténtalo de nuevo.');
}

async function verificarCodigoCorreo(correo: string, codigo: string) {
  const { error } = await obtenerSupabase().auth.verifyOtp({ email: correo, token: codigo, type: 'email' });
  if (error) throw fallo(error, 'No pudimos verificar el código. Inténtalo de nuevo.');
}

function cambiarClaveTemporal(sesion: Sesion, clave: string) {
  return cambiarTemporal(obtenerSupabase(), sesion, clave);
}

async function enviarCodigoRecuperacion(correo: string) {
  const { error } = await obtenerSupabase().auth.resetPasswordForEmail(correo);
  if (error) throw fallo(error, 'No pudimos enviar el código de recuperación. Inténtalo de nuevo.');
}

async function verificarCodigoRecuperacion(correo: string, codigo: string): Promise<RecuperacionVerificada> {
  const cliente = crearSupabaseRecuperacion();
  const { data, error } = await cliente.auth.verifyOtp({ email: correo, token: codigo, type: 'recovery' });
  if (error) throw fallo(error, 'No pudimos verificar el código. Inténtalo de nuevo.');

  const sesion = identidad(data.session);
  if (!sesion) throw new Error('El código no creó una sesión de recuperación. Pide otro.');

  const perfil = await consultarPerfil(cliente, sesion.usuarioId);
  if (!perfil?.activo || (!perfil.cambio_clave_pendiente && !perfil.correo_verificado_en)) {
    await cliente.auth.signOut({ scope: 'local' });
    throw new Error('Tu cuenta no está habilitada. Contacta a tu coordinador.');
  }

  return {
    async cambiarClave(clave) {
      if (perfil.cambio_clave_pendiente) {
        await cambiarTemporal(cliente, sesion, clave);
      } else {
        const { error: errorClave } = await cliente.auth.updateUser({ password: clave });
        if (errorClave) throw fallo(errorClave, 'No pudimos cambiar la contraseña. Inténtalo de nuevo.');
      }

      // Esta sesión solo vive en memoria y tiene un espacio separado del acceso normal.
      await cliente.auth.signOut({ scope: 'local' });
    },
  };
}

const recintoVisible = z.object({ nombre: z.string() });
const coordinacionVisible = z.object({ recinto: recintoVisible.nullable() });
const asignacionVisible = z.object({
  mesa: z.object({
    numero: z.number(),
    numero_jrv_cne: z.number().nullable(),
    sexo: z.enum(['F', 'M', 'X']),
    recinto: recintoVisible.nullable(),
  }).nullable(),
});

async function consultarAmbito(perfil: Perfil): Promise<string[]> {
  const cliente = obtenerSupabase();

  if (perfil.rol_codigo === 'provincial') {
    const { data, error } = await cliente.from('provincias')
      .select('nombre').eq('id', perfil.provincia_id).maybeSingle();
    if (error) throw fallo(error, 'No pudimos consultar tu provincia.');
    return data ? [data.nombre] : [];
  }

  if (perfil.rol_codigo === 'recinto') {
    const { data, error } = await cliente.from('coordinaciones')
      .select('recinto:recintos(nombre)').eq('coordinador_id', perfil.usuario_id).is('hasta', null);
    if (error) throw fallo(error, 'No pudimos consultar tus recintos.');
    return [...new Set(coordinacionVisible.array().parse(data).flatMap(({ recinto }) => recinto ? [recinto.nombre] : []))];
  }

  const { data, error } = await cliente.from('asignaciones')
    .select('mesa:mesas(numero,numero_jrv_cne,sexo,recinto:recintos(nombre))')
    .eq('veedor_id', perfil.usuario_id).is('hasta', null).maybeSingle();
  if (error) throw fallo(error, 'No pudimos consultar tu mesa.');
  const mesa = data ? asignacionVisible.parse(data).mesa : null;
  if (!mesa) return [];

  const nombre = mesa.numero_jrv_cne === null ? 'Mesa interna ' + mesa.numero : 'JRV ' + mesa.numero_jrv_cne;
  const sexo = { F: 'femenina', M: 'masculina', X: 'mixta' }[mesa.sexo];
  const nombreCompleto = nombre + ' ' + sexo;
  return mesa.recinto ? [nombreCompleto, mesa.recinto.nombre] : [nombreCompleto];
}

export const repositorioAcceso: RepositorioAcceso = {
  leerPerfilSinConexion,
  guardarPerfilSinConexion,
  consultarPerfil: (sesion) => consultarPerfil(obtenerSupabase(), sesion.usuarioId),
  tieneOtpReciente,
  observarSesion,
  iniciarSesion,
  cerrarSesion,
  enviarCodigoCorreo,
  verificarCodigoCorreo,
  cambiarClaveTemporal,
  enviarCodigoRecuperacion,
  verificarCodigoRecuperacion,
  consultarAmbito,
};
