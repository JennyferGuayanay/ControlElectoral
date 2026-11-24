import { z } from 'npm:zod@4.6.7';

import { atender, ErrorSolicitud, errorRpc, generarClaveTemporal } from '../_shared/http.ts';

const datosRestablecimiento = z.object({ usuario_id: z.uuid() });

Deno.serve(atender(async (cuerpo, contexto) => {
  const datos = datosRestablecimiento.safeParse(cuerpo);
  if (!datos.success || datos.data.usuario_id === contexto.usuarioId) {
    throw new ErrorSolicitud(400, 'Seleccione una cuenta a cargo para restablecer su clave.');
  }

  const { usuario_id: usuarioId } = datos.data;
  const { data: tokenCambio, error } = await contexto.administrador.rpc('preparar_cambio_de_clave', {
    p_actor_id: contexto.usuarioId,
    p_sesion_id: contexto.sesionId,
    p_usuario_id: usuarioId,
    p_otp_reciente: false,
  });
  if (error) throw errorRpc(error);

  const claveTemporal = generarClaveTemporal();
  const resultado = await contexto.administrador.auth.admin.updateUserById(usuarioId, {
    password: claveTemporal,
    app_metadata: { clave_electoral: tokenCambio },
  });
  if (resultado.error) {
    if (resultado.error.status && resultado.error.status < 500) {
      await contexto.administrador.rpc('cancelar_cambio_de_clave', { p_token: tokenCambio });
    }
    throw new ErrorSolicitud(422, 'No se pudo restablecer la clave de la cuenta.');
  }

  return { usuario_id: usuarioId, clave_temporal: claveTemporal };
}));
