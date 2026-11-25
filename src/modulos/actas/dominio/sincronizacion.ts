export type MotivoEnvio = 'red' | 'permisos' | 'fotografia' | 'servidor' | 'datos';
export type EstadoCola = 'pendiente' | 'sincronizando' | 'error';

export class FalloEnvio extends Error {
  constructor(readonly motivo: MotivoEnvio) {
    super(mensajesEnvio[motivo]);
  }
}

export const mensajesEnvio: Record<MotivoEnvio, string> = {
  red: 'Se interrumpió la conexión. El acta y su fotografía siguen guardadas.',
  permisos: 'El servidor no autorizó el envío. Comprueba tu sesión y la asignación de la mesa.',
  fotografia: 'No encontramos una fotografía válida en el dispositivo. El acta sigue bloqueada.',
  servidor: 'El servidor no completó el envío. El acta sigue guardada.',
  datos: 'El servidor rechazó los datos del acta. La versión confirmada permanece bloqueada.',
};

export function puedeReintentar(motivo: MotivoEnvio | null) {
  return motivo !== 'fotografia' && motivo !== 'datos';
}

export function demoraReintento(intento: number) {
  return Math.min(300_000, 3_000 * (2 ** Math.min(Math.max(intento - 1, 0), 7)));
}
