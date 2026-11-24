import { Stack } from 'expo-router';

import { pruebaSentryHabilitada } from '@/modulos/monitoreo/infraestructura/sentry';

export default function NavegacionProvincial() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="provincial" />
      <Stack.Protected guard={pruebaSentryHabilitada}>
        <Stack.Screen name="diagnostico-sentry" />
      </Stack.Protected>
    </Stack>
  );
}
