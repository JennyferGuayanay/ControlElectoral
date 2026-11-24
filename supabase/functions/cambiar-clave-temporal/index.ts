import { z } from 'npm:zod@4.6.7';

import { atender, ErrorSolicitud, errorRpc } from '../_shared/http.ts';

const datosCambio = z.object({ clave_nueva: z.string().min(8).max(72) });

Deno.serve(atender(async (cuerpo, contexto) => {
  const datos = datosCambio.safeParse(cuerpo);
  if (!datos.success || new TextEncoder().encode(datos.data.clave_nueva).length > 72) {
    throw new ErrorSolicitud(400, 'Escriba una nueva clave de al menos ocho caracteres.');
  }

  const { data: tokenCambio, error } = await contexto.administrador.rpc('preparar_cambio_de_clave', {
    p_actor_id: contexto.usuarioId,
    p_sesion_id: contexto.sesionId,
    p_usuario_id: contexto.usuarioId,
    p_otp_reciente: contexto.otpReciente,
  });
  if (error) throw errorRpc(error);

  // La operación de Auth del usuario exige una clave diferente y conserva su sesión actual.
  const resultado = await fetch(new URL('/auth/v1/user', contexto.url), {
    method: 'PUT',
    headers: {
      apikey: contexto.clavePublica,
      Authorization: `Bearer ${contexto.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ password: datos.data.clave_nueva }),
  });
  await resultado.body?.cancel();

  if (!resultado.ok) {
    if (resultado.status < 500) {
      await contexto.administrador.rpc('cancelar_cambio_de_clave', { p_token: tokenCambio });
    }
    throw new ErrorSolicitud(422, 'Supabase Auth rechazó la nueva clave. Revise los requisitos e intente con una diferente.');
  }

  const confirmacion = await contexto.administrador.auth.admin.updateUserById(contexto.usuarioId, {
    app_metadata: { clave_electoral: tokenCambio },
  });
  if (confirmacion.error) {
    throw new ErrorSolicitud(503, 'La clave cambió, pero la cuenta sigue pendiente de activación. Vuelva a iniciar sesión y repita el cambio.');
  }

  return { cambio_clave_pendiente: false };
}));
