import { z } from 'zod';

import { esquemaDignidad } from '@/modulos/actas/dominio/acta';

const id = z.number().int().positive();
const cantidad = z.number().int().nonnegative();
export const esquemaAvance = z.object({
  recinto_id: id, recinto: z.string(), mesas: cantidad,
  completas: cantidad, parciales: cantidad, pendientes: cantidad,
});
export const esquemaTotal = z.object({
  contienda_id: id, dignidad: esquemaDignidad, canton_id: id.nullable(), recinto_id: id.nullable(),
  candidato_id: id, candidato: z.string(), organizacion: z.string(),
  color: z.string().regex(/^#[\da-f]{6}$/i), es_simulacion: z.boolean(), total_votos: cantidad,
});
export const esquemaActaMesa = z.object({ mesa_id: id, dignidad_codigo: esquemaDignidad });

export type AvanceRecinto = z.infer<typeof esquemaAvance>;
export type TotalCandidato = z.infer<typeof esquemaTotal>;
export type ActaMesa = z.infer<typeof esquemaActaMesa>;
export type EstadoMesa = 0 | 1 | 2;

export function resumirAvance(recintos: AvanceRecinto[]) {
  const totales = recintos.reduce((suma, recinto) => ({
    mesas: suma.mesas + recinto.mesas,
    completas: suma.completas + recinto.completas,
    parciales: suma.parciales + recinto.parciales,
    pendientes: suma.pendientes + recinto.pendientes,
  }), { mesas: 0, completas: 0, parciales: 0, pendientes: 0 });

  const actas = 2 * totales.completas + totales.parciales;
  const esperadas = 2 * totales.mesas;
  return {
    ...totales, recintos: recintos.length, reportadas: totales.completas + totales.parciales, actas, esperadas,
    porcentaje: esperadas ? Math.round(1000 * actas / esperadas) / 10 : 0,
  };
}

export function sumarPorCandidatura(filas: TotalCandidato[]) {
  const candidatos = new Map<string, TotalCandidato>();
  for (const fila of filas) {
    const clave = `${fila.contienda_id}:${fila.candidato_id}`;
    const total = (candidatos.get(clave)?.total_votos ?? 0) + fila.total_votos;
    candidatos.set(clave, { ...fila, recinto_id: null, total_votos: total });
  }
  return [...candidatos.values()];
}

export function agruparPorContienda(totales: TotalCandidato[]) {
  const grupos = new Map<number, TotalCandidato[]>();
  for (const fila of totales) {
    const grupo = grupos.get(fila.contienda_id);
    if (grupo) grupo.push(fila);
    else grupos.set(fila.contienda_id, [fila]);
  }
  return [...grupos.values()];
}

export function contarActasPorMesa(actas: ActaMesa[]) {
  const dignidades = new Map<number, Set<ActaMesa['dignidad_codigo']>>();
  for (const acta of actas) {
    const grupo = dignidades.get(acta.mesa_id);
    if (grupo) grupo.add(acta.dignidad_codigo);
    else dignidades.set(acta.mesa_id, new Set([acta.dignidad_codigo]));
  }
  return (mesaId: number): EstadoMesa => {
    const cantidadActas = dignidades.get(mesaId)?.size ?? 0;
    return cantidadActas >= 2 ? 2 : cantidadActas === 1 ? 1 : 0;
  };
}
