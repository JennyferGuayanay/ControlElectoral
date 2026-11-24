import { z } from 'zod';

import { codificarUtf8 } from '@/compartido/utf8';

export const esquemaPerfil = z.object({
  usuario_id: z.uuid(),
  nombres: z.string(),
  apellidos: z.string(),
  correo: z.email(),
  provincia_id: z.number().int().positive(),
  rol_codigo: z.enum(['provincial', 'recinto', 'veedor']),
  activo: z.boolean(),
  cambio_clave_pendiente: z.boolean(),
  correo_verificado_en: z.string().nullable(),
});

export type Perfil = z.infer<typeof esquemaPerfil>;
export type Rol = Perfil['rol_codigo'];

export type EstadoAutenticado =
  | { tipo: 'correo'; perfil: Perfil }
  | { tipo: 'clave-temporal'; perfil: Perfil }
  | { tipo: 'habilitado'; perfil: Perfil }
  | { tipo: 'bloqueado' };

export function decidirAcceso(perfil: Perfil | null, otpReciente: boolean): EstadoAutenticado {
  if (!perfil?.activo) return { tipo: 'bloqueado' };
  if (!perfil.correo_verificado_en) {
    if (!perfil.cambio_clave_pendiente) return { tipo: 'bloqueado' };
    return { tipo: otpReciente ? 'clave-temporal' : 'correo', perfil };
  }

  return { tipo: perfil.cambio_clave_pendiente ? 'clave-temporal' : 'habilitado', perfil };
}

const correo = z.string().trim().toLowerCase().pipe(z.email('Escribe un correo válido.'));
const claveNueva = z.string()
  .min(8, 'Usa al menos 8 caracteres.')
  .refine((valor) => {
    try {
      return codificarUtf8(valor).length <= 72;
    } catch {
      return false;
    }
  }, 'Usa una contraseña más corta y con caracteres válidos.');

export const esquemaIngreso = z.object({
  correo,
  clave: z.string().min(1, 'Escribe tu contraseña.'),
});

export const esquemaCorreo = z.object({ correo });

export const esquemaCodigo = z.object({
  codigo: z.string().regex(/^[0-9]{6,10}$/, 'Escribe el código que recibiste por correo.'),
});

export const esquemaNuevaClave = z.object({
  clave: claveNueva,
  confirmacion: z.string().min(1, 'Escribe de nuevo la contraseña.'),
}).refine(({ clave, confirmacion }) => clave === confirmacion, {
  path: ['confirmacion'],
  message: 'Las contraseñas deben coincidir.',
});
