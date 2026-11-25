import { z } from 'zod';

import { obtenerSupabase } from '@/infraestructura/supabase';

import type { RepositorioSeguimiento } from '../aplicacion/seguimiento';
import { esquemaActaMesa, esquemaAvance, esquemaTotal } from '../dominio/seguimiento';

type Respuesta = { data: unknown; error: { code?: string } | null };

async function leerPaginas<T>(
  esquema: z.ZodType<T>, consultar: (desde: number, hasta: number) => PromiseLike<Respuesta>,
  signal?: AbortSignal,
) {
  const filas: T[] = [];
  const tamano = 200;
  for (let desde = 0; !signal?.aborted; desde += tamano) {
    const { data, error } = await consultar(desde, desde + tamano - 1);
    if (error?.code === '42501') throw new Error('El tablero requiere una cuenta provincial habilitada.');
    if (error) throw new Error('No pudimos actualizar los datos del escrutinio.');
    const pagina = esquema.array().parse(data);
    filas.push(...pagina);
    if (pagina.length < tamano) return filas;
  }
  throw new Error('Consulta cancelada.');
}

let secuenciaCanal = 0;

export const repositorioSeguimiento: RepositorioSeguimiento = {
  avance: (signal) => leerPaginas(esquemaAvance, (desde, hasta) => {
    const consulta = obtenerSupabase().rpc('avance_escrutinio', { p_recinto_id: null })
      .order('recinto_id').range(desde, hasta);
    return signal ? consulta.abortSignal(signal) : consulta;
  }, signal),
  totales: (dignidad, recintoId, signal) => leerPaginas(esquemaTotal, (desde, hasta) => {
    const consulta = obtenerSupabase().rpc('totales_escrutinio', { p_recinto_id: recintoId })
      .eq('dignidad', dignidad).order('contienda_id').order('candidato_id').range(desde, hasta);
    return signal ? consulta.abortSignal(signal) : consulta;
  }, signal),
  actasPorRecinto: (recintoId, signal) => leerPaginas(esquemaActaMesa, (desde, hasta) => {
    const consulta = obtenerSupabase().from('actas').select('mesa_id,dignidad_codigo,mesa:mesas!inner(recinto_id)')
      .eq('mesa.recinto_id', recintoId).order('id').range(desde, hasta);
    return signal ? consulta.abortSignal(signal) : consulta;
  }, signal),
  cantones: (signal) => leerPaginas(z.object({ id: z.number().int().positive(), nombre: z.string() }), (desde, hasta) => {
    const consulta = obtenerSupabase().from('cantones').select('id,nombre').order('id').range(desde, hasta);
    return signal ? consulta.abortSignal(signal) : consulta;
  }, signal),
  observarActas(alInsertar, alCambiarEstado) {
    const cliente = obtenerSupabase();
    const canal = cliente.channel(`seguimiento-actas-${++secuenciaCanal}`, {
      config: { postgres_changes_options: { wait: true } },
    }).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'actas', select: ['id'] }, () => alInsertar())
      .subscribe((estado) => alCambiarEstado(estado === 'SUBSCRIBED' ? 'en-vivo' : 'interrumpido'));
    return () => { void cliente.removeChannel(canal).catch(() => undefined); };
  },
};
