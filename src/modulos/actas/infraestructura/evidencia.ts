import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as Location from 'expo-location';

import { esquemaUbicacion } from '../dominio/acta';

export async function pedirUbicacion() {
  const permiso = await Location.requestForegroundPermissionsAsync();
  if (!permiso.granted) throw new Error('Autoriza la ubicación en los ajustes para respaldar esta fotografía.');
  if (!await Location.hasServicesEnabledAsync()) throw new Error('Activa la ubicación del dispositivo para continuar.');
}

export async function leerUbicacion() {
  let reloj: ReturnType<typeof setTimeout> | undefined;
  try {
    const posicion = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High, mayShowUserSettingsDialog: false }),
      new Promise<never>((_, rechazar) => {
        reloj = setTimeout(() => rechazar(new Error('La ubicación tardó demasiado. Acércate a un lugar despejado y repite la captura.')), 18_000);
      }),
    ]);
    if (posicion.coords.accuracy === null) throw new Error('La ubicación no informó su precisión. Repite la captura.');
    return esquemaUbicacion.parse({
      latitud: posicion.coords.latitude, longitud: posicion.coords.longitude, precision_metros: posicion.coords.accuracy,
      capturada_en: new Date(posicion.timestamp).toISOString(), ubicacion_simulada: posicion.mocked === true,
    });
  } finally {
    clearTimeout(reloj);
  }
}

export function borrarTemporal(uri: string) {
  try {
    const archivo = new File(uri);
    if (archivo.exists) archivo.delete();
  } catch {
    // El sistema limpia los archivos de caché restantes.
  }
}

export async function comprimirFoto(ruta: string) {
  const uri = ruta.startsWith('file://') ? ruta : `file://${ruta}`;
  const contexto = ImageManipulator.manipulate(uri);
  try {
    const imagen = await contexto.resize({ width: 1800 }).renderAsync();
    try {
      const foto = await imagen.saveAsync({ format: SaveFormat.JPEG, compress: 0.82 });
      const tamano = new File(foto.uri).size;
      if (tamano > 0 && tamano <= 8 * 1024 * 1024) return foto.uri;
      borrarTemporal(foto.uri);
      throw new Error('La foto comprimida no cumple el tamaño permitido. Repite la captura.');
    } finally {
      imagen.release();
    }
  } finally {
    contexto.release();
    borrarTemporal(uri);
  }
}
