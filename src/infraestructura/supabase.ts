import 'react-native-url-polyfill/auto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { almacenSesion } from './almacen-sesion';

let cliente: SupabaseClient | undefined;
let recuperaciones = 0;

function configuracionSupabase() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const clave = process.env.EXPO_PUBLIC_SUPABASE_KEY;

  if (!url || !clave) {
    throw new Error('Configura la URL y la clave pública de Supabase.');
  }

  return { url, clave };
}

export function obtenerSupabase(): SupabaseClient {
  if (cliente) return cliente;

  const { url, clave } = configuracionSupabase();
  const supabase = createClient(url, clave, {
    auth: {
      storage: almacenSesion,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });

  if (Platform.OS !== 'web') {
    const renovarSegunEstado = (estado: string | null) => {
      if (estado === 'active') {
        void supabase.auth.startAutoRefresh();
      } else {
        void supabase.auth.stopAutoRefresh();
      }
    };

    AppState.addEventListener('change', renovarSegunEstado);
    renovarSegunEstado(AppState.currentState);
  }

  cliente = supabase;
  return cliente;
}

export function crearSupabaseRecuperacion(): SupabaseClient {
  const { url, clave } = configuracionSupabase();
  recuperaciones += 1;

  // El OTP de recuperación no inicia sesión en el cliente electoral.
  return createClient(url, clave, {
    auth: {
      storageKey: `control-electoral-recuperacion-${recuperaciones}`,
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
