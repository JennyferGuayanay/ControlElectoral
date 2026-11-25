import { Stack } from 'expo-router';

import { useAcceso } from '@/modulos/acceso/presentacion/proveedor-acceso';
import { pruebaSentryHabilitada } from '@/modulos/monitoreo/infraestructura/sentry';
import { repositorioSeguimiento } from '@/modulos/seguimiento/infraestructura/supabase-seguimiento';
import { SeguimientoEnVivo } from '@/modulos/seguimiento/presentacion/seguimiento-en-vivo';

export default function NavegacionProvincial() {
  const { estado } = useAcceso();
  const navegacion = (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="provincial" />
      <Stack.Screen name="territorio" />
      <Stack.Screen name="cuentas-provinciales" />
      <Stack.Screen name="coordinaciones" />
      <Stack.Screen name="actas-provinciales" />
      <Stack.Screen name="seguimiento" />
      <Stack.Protected guard={pruebaSentryHabilitada}>
        <Stack.Screen name="diagnostico-sentry" />
      </Stack.Protected>
    </Stack>
  );
  if (estado.tipo !== 'habilitado' || estado.perfil.rol_codigo !== 'provincial') return navegacion;

  return (
    <SeguimientoEnVivo autor={estado.perfil.usuario_id} repositorio={repositorioSeguimiento}>
      {navegacion}
    </SeguimientoEnVivo>
  );
}
