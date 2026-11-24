import { Stack } from 'expo-router';

import { useAcceso } from '@/modulos/acceso/presentacion/proveedor-acceso';

export default function NavegacionAcceso() {
  const { estado } = useAcceso();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={estado.tipo === 'sin-sesion'}>
        <Stack.Screen name="ingresar" />
        <Stack.Screen name="recuperar" />
      </Stack.Protected>
      <Stack.Protected guard={estado.tipo === 'correo'}>
        <Stack.Screen name="verificar-correo" />
      </Stack.Protected>
      <Stack.Protected guard={estado.tipo === 'clave-temporal'}>
        <Stack.Screen name="cambiar-clave" />
      </Stack.Protected>
    </Stack>
  );
}
