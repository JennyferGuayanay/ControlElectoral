import type { ArchivosActas } from '../aplicacion/actas';

const mensaje = 'Usa la aplicación móvil para capturar y enviar evidencias.';
export const archivosActas: ArchivosActas = {
  async guardar() { throw new Error(mensaje); },
  uri() { return ''; },
  async leer() { throw new Error(mensaje); },
  async eliminar() {},
};
