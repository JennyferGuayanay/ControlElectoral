import type { Dignidad } from '@/modulos/actas/dominio/acta';

import { sumarPorCandidatura, type ActaMesa, type AvanceRecinto, type TotalCandidato } from '../dominio/seguimiento';

export type EstadoCanal = 'conectando' | 'en-vivo' | 'interrumpido';
export type AlcanceResultados = { tipo: 'provincia' } | { tipo: 'recinto'; id: number }
  | { tipo: 'parroquia'; id: number; recintoIds: number[] };

export interface RepositorioSeguimiento {
  avance(signal?: AbortSignal): Promise<AvanceRecinto[]>;
  totales(dignidad: Dignidad, recintoId: number | null, signal?: AbortSignal): Promise<TotalCandidato[]>;
  actasPorRecinto(recintoId: number, signal?: AbortSignal): Promise<ActaMesa[]>;
  cantones(signal?: AbortSignal): Promise<{ id: number; nombre: string }[]>;
  observarActas(alInsertar: () => void, alCambiarEstado: (estado: EstadoCanal) => void): () => void;
}

export async function consultarResultados(
  repositorio: RepositorioSeguimiento, dignidad: Dignidad, alcance: AlcanceResultados, signal?: AbortSignal,
) {
  if (alcance.tipo === 'provincia') return repositorio.totales(dignidad, null, signal);
  if (alcance.tipo === 'recinto') return repositorio.totales(dignidad, alcance.id, signal);

  // La RPC agrega en PostgreSQL. Para una parroquia se suman solo los totales de sus recintos.
  const filas: TotalCandidato[] = [];
  for (let inicio = 0; inicio < alcance.recintoIds.length && !signal?.aborted; inicio += 4) {
    const parciales = await Promise.all(
      alcance.recintoIds.slice(inicio, inicio + 4).map((id) => repositorio.totales(dignidad, id, signal)),
    );
    filas.push(...parciales.flat());
  }
  return sumarPorCandidatura(filas);
}
