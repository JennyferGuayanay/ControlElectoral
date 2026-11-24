import { createClient } from 'npm:@supabase/supabase-js@2.119.2';

const cabeceras = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json; charset=utf-8',
};

export class ErrorSolicitud extends Error {
  constructor(readonly estado: number, mensaje: string) {
    super(mensaje);
  }
}

function variable(nombre: string) {
  const valor = Deno.env.get(nombre);
  if (!valor) throw new Error('Falta una variable del servidor.');
  return valor;
}

function responder(estado: number, contenido: unknown) {
  return new Response(JSON.stringify(contenido), { status: estado, headers: cabeceras });
}

async function validarSesion(solicitud: Request) {
  const token = /^Bearer\s+(\S+)$/i.exec(solicitud.headers.get('Authorization') ?? '')?.[1];
  if (!token) throw new ErrorSolicitud(401, 'Inicie sesión para continuar.');

  const url = variable('SUPABASE_URL');
  const clavePublica = variable('SUPABASE_ANON_KEY');
  const auth = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false };
  const publico = createClient(url, clavePublica, { auth });
  const { data, error } = await publico.auth.getClaims(token);
  const claims = data?.claims;
  if (error || claims?.role !== 'authenticated' || !claims.sub || !claims.session_id) {
    throw new ErrorSolicitud(401, 'La sesión caducó o es inválida.');
  }

  const ahora = Date.now() / 1000;
  const otpReciente = (claims.amr ?? []).some((registro) =>
    typeof registro !== 'string' &&
    (registro.method === 'otp' || registro.method === 'recovery') &&
    registro.timestamp <= ahora && ahora - registro.timestamp <= 600
  );

  return {
    url,
    clavePublica,
    token,
    usuarioId: claims.sub,
    sesionId: claims.session_id,
    otpReciente,
    administrador: createClient(url, variable('SUPABASE_SERVICE_ROLE_KEY'), { auth }),
  };
}

type Contexto = Awaited<ReturnType<typeof validarSesion>>;

export function atender(accion: (cuerpo: unknown, contexto: Contexto) => Promise<unknown>) {
  return async (solicitud: Request): Promise<Response> => {
    if (solicitud.method === 'OPTIONS') return new Response(null, { status: 204, headers: cabeceras });
    if (solicitud.method !== 'POST') return responder(405, { mensaje: 'Método no permitido.' });

    try {
      const contexto = await validarSesion(solicitud);
      let cuerpo: unknown;
      try {
        cuerpo = await solicitud.json();
      } catch {
        throw new ErrorSolicitud(400, 'Envíe un cuerpo JSON válido.');
      }
      return responder(200, await accion(cuerpo, contexto));
    } catch (error) {
      if (error instanceof ErrorSolicitud) {
        return responder(error.estado, { mensaje: error.message });
      }
      return responder(500, { mensaje: 'No se pudo completar la operación de acceso.' });
    }
  };
}

export function errorRpc(error: { code: string }) {
  switch (error.code) {
    case '22023':
    case '23514':
      return new ErrorSolicitud(400, 'Revise los datos enviados.');
    case '42501':
      return new ErrorSolicitud(403, 'La cuenta no está autorizada para esta operación.');
    case '23505':
      return new ErrorSolicitud(409, 'Ya existe una cuenta con esos datos.');
    case '55P03':
      return new ErrorSolicitud(409, 'Ya hay un cambio de clave en proceso.');
    default:
      return new ErrorSolicitud(500, 'No se pudo consultar el estado de la cuenta.');
  }
}

export function generarClaveTemporal(): string {
  const aleatorio = crypto.getRandomValues(new Uint8Array(12));
  const codigo = Array.from(aleatorio, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `Ce-${codigo}!`;
}
