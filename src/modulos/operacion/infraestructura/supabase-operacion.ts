import { FunctionsHttpError } from '@supabase/supabase-js';
import { z } from 'zod';

import { obtenerSupabase as cliente } from '@/infraestructura/supabase';

import type { RepositorioOperacion } from '../aplicacion/operacion';

const id = z.number().int().positive();
const nombre = z.object({ nombre: z.string() });
const persona = z.object({ nombres: z.string(), apellidos: z.string() });
const parroquia = nombre.extend({ id, canton: nombre.nullable() });
const recinto = nombre.extend({ id, parroquia_id: id, zona: z.string(), direccion: z.string().nullable() });
const mesa = z.object({
  id, numero: id, numero_jrv_cne: id.nullable(), sexo: z.enum(['F', 'M', 'X']), es_simulacion: z.boolean(),
});
const cuenta = persona.extend({
  usuario_id: z.uuid(), correo: z.string(), rol_codigo: z.enum(['recinto', 'veedor']), activo: z.boolean(),
  recinto_base_id: id.nullable(), cambio_clave_pendiente: z.boolean(), correo_verificado_en: z.string().nullable(),
});
const vigencia = z.object({
  id, desde: z.string(), hasta: z.string().nullable(), responsable_id: z.uuid(), responsable: persona.nullable(),
});
const mesaAsignada = z.object({
  desde: z.string(),
  mesa: mesa.extend({ recinto: recinto.extend({ parroquia: parroquia.nullable() }).nullable() }).nullable(),
});

const camposParroquia = 'id,nombre,canton:cantones(nombre)';
const camposRecinto = 'id,nombre,parroquia_id,zona,direccion';
const camposMesa = 'id,numero,numero_jrv_cne,sexo,es_simulacion';
const camposCuenta = 'usuario_id,nombres,apellidos,correo,rol_codigo,activo,recinto_base_id,cambio_clave_pendiente,correo_verificado_en';

type Respuesta = { data: unknown; error: { code?: string } | null };

function resultado({ data, error }: Respuesta, alternativa: string) {
  switch (error?.code) {
    case undefined:
      if (!error) return data;
      break;
    case '42501':
      throw new Error('Tu cuenta no tiene permiso para realizar esta operación.');
    case '23505':
      throw new Error('Ya existe un registro con esos datos. Actualiza la lista antes de continuar.');
    case '40001':
      throw new Error('La asignación cambió. Revisa la información actualizada antes de continuar.');
    case '22023':
      throw new Error(alternativa);
  }
  throw new Error(alternativa);
}

async function leerPaginas<T>(
  esquema: z.ZodType<T>,
  consultar: (inicio: number, fin: number) => PromiseLike<Respuesta>,
) {
  const filas: T[] = [];
  const tamano = 200;
  for (let inicio = 0; ; inicio += tamano) {
    const pagina = esquema.array().parse(resultado(
      await consultar(inicio, inicio + tamano - 1), 'No pudimos consultar los datos. Intenta de nuevo.',
    ));
    filas.push(...pagina);
    if (pagina.length < tamano) return filas;
  }
}

async function claveTemporal(accion: 'crear-cuenta' | 'restablecer-clave', cuerpo: object) {
  const { data, error } = await cliente().functions.invoke(accion, { body: cuerpo });
  if (error instanceof FunctionsHttpError) {
    switch (error.context.status) {
      case 400: throw new Error('Revisa los datos de la cuenta y el recinto seleccionado.');
      case 401: throw new Error('Tu sesión caducó. Vuelve a iniciar sesión.');
      case 403: throw new Error('Tu cuenta no tiene permiso para gestionar este usuario.');
      case 409: throw new Error(accion === 'crear-cuenta'
        ? 'Ya existe una cuenta con esa cédula o correo.'
        : 'Ya hay un cambio de clave en curso. Intenta de nuevo más tarde.');
      case 429: throw new Error('Espera un momento antes de volver a intentarlo.');
    }
  }
  if (error) throw new Error('No pudimos confirmar la operación. Revisa la lista antes de intentarla de nuevo.');

  return z.object({ clave_temporal: z.string().min(8) }).parse(data).clave_temporal;
}

export const repositorioOperacion: RepositorioOperacion = {
  parroquias: () => leerPaginas(parroquia, (inicio, fin) => cliente().from('parroquias')
    .select(camposParroquia).order('nombre').order('id').range(inicio, fin)),
  recintos: () => leerPaginas(recinto, (inicio, fin) => cliente().from('recintos')
    .select(camposRecinto).order('nombre').order('id').range(inicio, fin)),
  mesas: (recintoId) => leerPaginas(mesa, (inicio, fin) => cliente().from('mesas')
    .select(camposMesa).eq('recinto_id', recintoId).order('numero').order('sexo').order('id').range(inicio, fin)),
  async agregarRecinto(datos) {
    resultado(await cliente().rpc('agregar_recinto', {
      p_parroquia_id: datos.parroquiaId, p_nombre: datos.nombre, p_zona: datos.zona, p_direccion: datos.direccion || null,
    }), 'No pudimos crear el recinto. Revisa los datos y tu conexión.');
  },
  cuentas: (rol, recintoId) => leerPaginas(cuenta, (inicio, fin) => {
    const consulta = cliente().from('perfiles').select(camposCuenta).eq('rol_codigo', rol);
    return (recintoId === undefined ? consulta : consulta.eq('recinto_base_id', recintoId))
      .order('apellidos').order('nombres').order('usuario_id').range(inicio, fin);
  }),
  crearCuenta: ({ recintoId, ...datos }) => claveTemporal('crear-cuenta', {
    ...datos, ...(recintoId !== null && { recinto_id: recintoId }),
  }),
  async cambiarEstadoCuenta(usuarioId, activo) {
    resultado(await cliente().rpc('cambiar_estado_cuenta', { p_usuario_id: usuarioId, p_activo: activo }),
      'No pudimos cambiar el estado de la cuenta. Actualiza la lista e inténtalo de nuevo.');
  },
  restablecerClave: (usuarioId) => claveTemporal('restablecer-clave', { usuario_id: usuarioId }),
  coordinaciones: (recintoId) => leerPaginas(vigencia, (inicio, fin) => cliente().from('coordinaciones')
    .select('id,desde,hasta,responsable_id:coordinador_id,responsable:perfiles!coordinaciones_coordinador_id_fkey(nombres,apellidos)')
    .eq('recinto_id', recintoId).order('desde', { ascending: false }).order('id', { ascending: false }).range(inicio, fin)),
  async coordinarRecinto(recintoId, coordinadorId) {
    resultado(await cliente().rpc('coordinar_recinto', { p_recinto_id: recintoId, p_coordinador_id: coordinadorId }),
      'No pudimos guardar la coordinación. Verifica que el coordinador esté habilitado.');
  },
  asignaciones: (mesaId) => leerPaginas(vigencia, (inicio, fin) => cliente().from('asignaciones')
    .select('id,desde,hasta,responsable_id:veedor_id,responsable:perfiles!asignaciones_veedor_id_fkey(nombres,apellidos)')
    .eq('mesa_id', mesaId).order('desde', { ascending: false }).order('id', { ascending: false }).range(inicio, fin)),
  async veedoresOcupados(recintoId) {
    const filas = await leerPaginas(z.object({ veedor_id: z.uuid() }), (inicio, fin) => cliente().from('asignaciones')
      .select('veedor_id,mesa:mesas!inner(recinto_id)').eq('mesa.recinto_id', recintoId)
      .is('hasta', null).order('id').range(inicio, fin));
    return new Set(filas.map((fila) => fila.veedor_id));
  },
  async asignarVeedor(mesaId, veedorId, asignacionEsperadaId) {
    const datos = { p_mesa_id: mesaId, p_veedor_id: veedorId };
    const respuesta = asignacionEsperadaId === undefined
      ? await cliente().rpc('asignar_veedor', datos)
      : await cliente().rpc('reemplazar_veedor', { ...datos, p_asignacion_esperada_id: asignacionEsperadaId });
    resultado(respuesta, 'No pudimos guardar la asignación. Verifica que el veedor esté disponible en este recinto.');
  },
  async miMesa(veedorId) {
    const { data, error } = await cliente().from('asignaciones')
      .select(`desde,mesa:mesas(${camposMesa},recinto:recintos(${camposRecinto},parroquia:parroquias(${camposParroquia})))`)
      .eq('veedor_id', veedorId).is('hasta', null).maybeSingle();
    return mesaAsignada.nullable().parse(resultado({ data, error }, 'No pudimos consultar tu mesa asignada.'));
  },
};
