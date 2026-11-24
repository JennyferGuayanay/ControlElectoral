import { decidirAcceso, type Perfil } from '../dominio/acceso';

export type Sesion = { usuarioId: string; token: string };
export type RecuperacionVerificada = { cambiarClave(clave: string): Promise<void> };

export interface LecturaAcceso {
  consultarPerfil(sesion: Sesion): Promise<Perfil | null>;
  tieneOtpReciente(sesion: Sesion): Promise<boolean>;
}

export interface RepositorioAcceso extends LecturaAcceso {
  observarSesion(notificar: (sesion: Sesion | null) => void): () => void;
  iniciarSesion(correo: string, clave: string): Promise<void>;
  cerrarSesion(): Promise<void>;
  enviarCodigoCorreo(correo: string): Promise<void>;
  verificarCodigoCorreo(correo: string, codigo: string): Promise<void>;
  cambiarClaveTemporal(sesion: Sesion, clave: string): Promise<void>;
  enviarCodigoRecuperacion(correo: string): Promise<void>;
  verificarCodigoRecuperacion(correo: string, codigo: string): Promise<RecuperacionVerificada>;
  consultarAmbito(perfil: Perfil): Promise<string[]>;
}

export async function resolverAcceso(lectura: LecturaAcceso, sesion: Sesion) {
  const perfil = await lectura.consultarPerfil(sesion);
  const debeComprobarCodigo = perfil?.activo && perfil.cambio_clave_pendiente && !perfil.correo_verificado_en;
  const otpReciente = debeComprobarCodigo ? await lectura.tieneOtpReciente(sesion) : false;
  return decidirAcceso(perfil, otpReciente);
}
