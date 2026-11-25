import { CryptoDigestAlgorithm, digestStringAsync } from 'expo-crypto';
import { z } from 'zod';

import { almacenSesion } from '@/infraestructura/almacen-sesion';

import type { Sesion } from '../aplicacion/acceso';
import { esquemaPerfil, type Perfil } from '../dominio/acceso';

const clave = 'control-electoral.perfil-veedor-offline';
const esquema = z.object({ perfil: esquemaPerfil, huella: z.string() });
const huella = (token: string) => digestStringAsync(CryptoDigestAlgorithm.SHA256, token);

function admiteModoLocal(perfil: Perfil | null, sesion: Sesion): perfil is Perfil {
  return !!perfil && perfil.usuario_id === sesion.usuarioId && perfil.rol_codigo === 'veedor'
    && perfil.activo && !!perfil.correo_verificado_en && !perfil.cambio_clave_pendiente
    && sesion.expiraEn > Date.now();
}

export async function guardarPerfilSinConexion(sesion: Sesion, perfil: Perfil | null) {
  if (!admiteModoLocal(perfil, sesion)) {
    await borrarPerfilSinConexion();
    return;
  }
  await almacenSesion.setItem(clave, JSON.stringify({ perfil, huella: await huella(sesion.token) }));
}

export async function leerPerfilSinConexion(sesion: Sesion) {
  if (sesion.expiraEn <= Date.now()) return null;
  const contenido = await almacenSesion.getItem(clave);
  if (!contenido) return null;
  const resultado = esquema.safeParse(JSON.parse(contenido));
  if (!resultado.success || !admiteModoLocal(resultado.data.perfil, sesion)
    || resultado.data.huella !== await huella(sesion.token)) return null;
  return resultado.data.perfil;
}

export async function borrarPerfilSinConexion() {
  await almacenSesion.removeItem(clave);
}
