import { randomUUID } from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';

import type { ArchivosActas } from '../aplicacion/actas';
import { FalloEnvio } from '../dominio/sincronizacion';

function carpeta() {
  return new Directory(Paths.document, 'actas-evidencias');
}
function carpetaAutor(autorId: string) {
  return new Directory(carpeta(), autorId);
}
function archivo(autorId: string, nombre: string) {
  const propio = new File(carpetaAutor(autorId), nombre);
  // Las fotos de la versión anterior usaban la raíz. Solo se consultan desde un acta del autor.
  return propio.exists ? propio : new File(carpeta(), nombre);
}

export const archivosActas: ArchivosActas = {
  async guardar(autorId, temporal) {
    const directorio = carpetaAutor(autorId);
    directorio.create({ intermediates: true, idempotent: true });
    const nombre = `${randomUUID()}.jpg`;
    await new File(temporal).copy(new File(directorio, nombre));
    return nombre;
  },
  uri: (autorId, nombre) => archivo(autorId, nombre).uri,
  async leer(autorId, nombre) {
    try {
      const foto = archivo(autorId, nombre);
      if (!foto.exists || foto.size <= 0 || foto.size > 8 * 1024 * 1024) throw new FalloEnvio('fotografia');
      const bytes = await foto.bytes();
      if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new FalloEnvio('fotografia');
      return bytes.buffer;
    } catch {
      throw new FalloEnvio('fotografia');
    }
  },
  async eliminar(autorId, nombre) {
    const destino = archivo(autorId, nombre);
    if (destino.exists) destino.delete();
  },
};
