import {
  AESEncryptionKey,
  AESSealedData,
  aesDecryptAsync,
  aesEncryptAsync,
} from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import almacenamiento from 'expo-sqlite/kv-store';

import { codificarUtf8 } from '@/compartido/utf8';

const nombreLlave = 'control-electoral.sesion.aes';
let creacionLlave: Promise<AESEncryptionKey> | undefined;

async function leerLlave() {
  const valor = await SecureStore.getItemAsync(nombreLlave);
  return valor ? AESEncryptionKey.import(valor, 'base64') : null;
}

function obtenerLlave() {
  creacionLlave ??= (async () => {
    const existente = await leerLlave();
    if (existente) return existente;

    const llave = await AESEncryptionKey.generate();
    await SecureStore.setItemAsync(nombreLlave, await llave.encoded('base64'), {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    });
    return llave;
  })().finally(() => {
    creacionLlave = undefined;
  });

  return creacionLlave;
}

async function borrarSesion(nombre: string) {
  await Promise.all([almacenamiento.removeItem(nombre), SecureStore.deleteItemAsync(nombre)]);
}

export const almacenSesion = {
  async getItem(nombre: string) {
    const contenido = await almacenamiento.getItem(nombre);
    if (!contenido) return SecureStore.getItemAsync(nombre);

    const llave = await leerLlave();
    if (llave) {
      try {
        const bytes = await aesDecryptAsync(AESSealedData.fromCombined(contenido), llave, {
          additionalData: codificarUtf8(nombre),
        });
        return new TextDecoder().decode(bytes);
      } catch {
        // Un registro alterado o de otra instalación no puede restaurar una sesión.
      }
    }

    await borrarSesion(nombre);
    return null;
  },
  async setItem(nombre: string, valor: string) {
    const datos = await aesEncryptAsync(codificarUtf8(valor), await obtenerLlave(), {
      additionalData: codificarUtf8(nombre),
    });
    await almacenamiento.setItem(nombre, await datos.combined('base64'));
    await SecureStore.deleteItemAsync(nombre);
  },
  removeItem: borrarSesion,
};
