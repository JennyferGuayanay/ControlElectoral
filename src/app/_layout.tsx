import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import { repositorioAcceso } from '@/modulos/acceso/infraestructura/repositorio-supabase';
import { Aviso, Boton, Encabezado, Marco } from '@/modulos/acceso/presentacion/interfaz';
import { ProveedorAcceso, useAcceso } from '@/modulos/acceso/presentacion/proveedor-acceso';
import { ActivarSincronizacionActas } from '@/modulos/actas/presentacion/activar-sincronizacion';
import { obtenerPantalla } from '@/modulos/monitoreo/aplicacion/monitoreo';
import { LimiteErrores, fijarContexto, reportarFallo } from '@/modulos/monitoreo/infraestructura/sentry';

function RutasProtegidas() {
  const { estado } = useAcceso();
  const segmentos = useSegments();
  const rol = estado.tipo === 'habilitado' ? estado.perfil.rol_codigo : null;
  const enAcceso = estado.tipo === 'sin-sesion' || estado.tipo === 'correo' || estado.tipo === 'clave-temporal';
  const pantalla = obtenerPantalla(segmentos.at(-1));

  useEffect(() => {
    fijarContexto(pantalla, rol ?? 'sin-sesion');
  }, [pantalla, rol]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!enAcceso && !rol}>
        <Stack.Screen name="index" />
      </Stack.Protected>
      <Stack.Protected guard={enAcceso}>
        <Stack.Screen name="(acceso)" />
      </Stack.Protected>
      <Stack.Protected guard={rol === 'provincial'}>
        <Stack.Screen name="(provincial)" />
      </Stack.Protected>
      <Stack.Protected guard={rol === 'recinto'}>
        <Stack.Screen name="(recinto)" />
      </Stack.Protected>
      <Stack.Protected guard={rol === 'veedor'}>
        <Stack.Screen name="(veedor)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function NavegacionPrincipal() {
  const [consultas] = useState(() => new QueryClient());
  return (
    <LimiteErrores fallback={({ resetError }) => (
      <Marco>
        <Encabezado titulo="Interrupción inesperada" />
        <Aviso mensaje={{ tipo: 'error', texto: 'La pantalla se interrumpió. Vuelve a intentarlo.' }} />
        <Boton titulo="Volver a intentar" alPulsar={resetError} />
      </Marco>
    )}>
      <QueryClientProvider client={consultas}>
        <ProveedorAcceso repositorio={repositorioAcceso} reportarFallo={reportarFallo}>
          <StatusBar style="dark" />
          <ActivarSincronizacionActas />
          <RutasProtegidas />
        </ProveedorAcceso>
      </QueryClientProvider>
    </LimiteErrores>
  );
}
