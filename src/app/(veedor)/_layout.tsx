import { Stack } from 'expo-router';

export default function NavegacionVeedor() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="veedor" />
      <Stack.Screen name="mi-asignacion" />
      <Stack.Screen name="actas" />
    </Stack>
  );
}
