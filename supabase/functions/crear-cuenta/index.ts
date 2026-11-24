import { z } from 'npm:zod@4.6.7';

import { atender, ErrorSolicitud, errorRpc, generarClaveTemporal } from '../_shared/http.ts';

const datosAlta = z.object({
  rol: z.enum(['recinto', 'veedor']),
  recinto_id: z.number().int().positive().optional(),
  cedula: z.string().regex(/^\d{10}$/),
  nombres: z.string().trim().min(1).max(120),
  apellidos: z.string().trim().min(1).max(120),
  telefono: z.string().trim().regex(/^\+?\d{7,15}$/),
  correo: z.string().trim().toLowerCase().max(254).pipe(z.email()),
});

Deno.serve(atender(async (cuerpo, contexto) => {
  const datos = datosAlta.safeParse(cuerpo);
  if (!datos.success) throw new ErrorSolicitud(400, 'Revise los datos obligatorios del usuario.');

  const perfil = datos.data;
  const { data: tokenAlta, error } = await contexto.administrador.rpc('preparar_alta_usuario', {
    p_actor_id: contexto.usuarioId,
    p_sesion_id: contexto.sesionId,
    p_rol: perfil.rol,
    p_recinto_id: perfil.recinto_id ?? null,
    p_cedula: perfil.cedula,
    p_nombres: perfil.nombres,
    p_apellidos: perfil.apellidos,
    p_telefono: perfil.telefono,
    p_correo: perfil.correo,
  });
  if (error) throw errorRpc(error);

  const claveTemporal = generarClaveTemporal();
  const resultado = await contexto.administrador.auth.admin.createUser({
    email: perfil.correo,
    password: claveTemporal,
    // Habilita el ingreso temporal. El correo electoral se verifica con OTP antes de operar.
    email_confirm: true,
    app_metadata: { alta_electoral: tokenAlta },
  });
  if (resultado.error || !resultado.data.user) {
    if (resultado.error?.code === 'email_exists') {
      throw new ErrorSolicitud(409, 'Ya existe una cuenta con ese correo.');
    }
    throw new ErrorSolicitud(422, 'No se pudo crear la cuenta. Verifique los datos e intente de nuevo.');
  }

  return { usuario_id: resultado.data.user.id, clave_temporal: claveTemporal };
}));
