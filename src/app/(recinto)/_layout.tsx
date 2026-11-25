import { Stack } from 'expo-router';

export default function NavegacionRecinto() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="recinto" />
      <Stack.Screen name="mesas-recinto" />
      <Stack.Screen name="veedores-recinto" />
      <Stack.Screen name="actas-recinto" />
    </Stack>
  );
}
