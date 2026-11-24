import { randomUUID } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const clave = 'control-electoral.monitoreo.instalacion';

export async function obtenerIdInstalacion() {
  const anterior = await SecureStore.getItemAsync(clave);
  if (anterior) return anterior;

  const id = randomUUID();
  await SecureStore.setItemAsync(clave, id, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  });
  return id;
}
