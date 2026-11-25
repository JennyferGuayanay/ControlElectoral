import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import AnimacionCarga from '@/compartido/presentacion/animacion-carga';
import { Enlace } from '@/modulos/acceso/presentacion/interfaz';
import type { Dignidad } from '@/modulos/actas/dominio/acta';
import type { RepositorioOperacion } from '@/modulos/operacion/aplicacion/operacion';
import { rotuloMesa } from '@/modulos/operacion/dominio/operacion';
import { EstadoConsulta, EstadoRegistro, Lista, Opciones, Tarjeta, Texto } from '@/modulos/operacion/presentacion/componentes';

import type { RepositorioSeguimiento } from '../aplicacion/seguimiento';
import { contarActasPorMesa, type EstadoMesa } from '../dominio/seguimiento';
import { claveDatosSeguimiento } from './seguimiento-en-vivo';

const filtros = [
  { id: 'todas', texto: 'Todas' }, { id: 0, texto: 'Sin actas' },
  { id: 1, texto: 'Una acta' }, { id: 2, texto: 'Dos actas' },
] as const;
const textos = { 0: '0 de 2 actas · Pendiente', 1: '1 de 2 actas · Parcial', 2: '2 de 2 actas · Completa' };
const tonos = { 0: 'neutro', 1: 'alerta', 2: 'positivo' } as const;

export function MesasSeguimiento({ autor, recintoId, dignidad, conectado, repositorio, territorio }: {
  autor: string; recintoId: number; dignidad: Dignidad; conectado: boolean;
  repositorio: RepositorioSeguimiento; territorio: RepositorioOperacion;
}) {
  const [filtro, fijarFiltro] = useState<EstadoMesa | 'todas'>('todas');
  const consulta = useQuery({
    queryKey: [...claveDatosSeguimiento(autor), 'mesas', recintoId],
    enabled: conectado, gcTime: 0, retry: 1, staleTime: 12_000,
    queryFn: async ({ signal }) => {
      const [mesas, actas] = await Promise.all([territorio.mesas(recintoId), repositorio.actasPorRecinto(recintoId, signal)]);
      const cantidad = contarActasPorMesa(actas);
      return mesas.map((mesa) => ({ ...mesa, actas: cantidad(mesa.id) }));
    },
  });
  const visibles = (consulta.data ?? []).filter((mesa) => filtro === 'todas' || mesa.actas === filtro);

  return (
    <Tarjeta titulo="Estado de las mesas" icono="mesa">
      <Opciones<EstadoMesa | 'todas'> opciones={[...filtros]} valor={filtro} elegir={fijarFiltro} />
      {consulta.isFetching && <Texto>Actualizando mesas…</Texto>}
      {!conectado && !consulta.data ? <Texto>Conéctate para consultar las mesas de este recinto.</Texto> : (
        <EstadoConsulta consulta={{
          isPending: !consulta.data && consulta.isPending,
          isError: !consulta.data && consulta.isError,
          refetch: consulta.refetch,
        }} ilustracionCarga={<AnimacionCarga />}>
          {consulta.isError && consulta.data && <Texto>No se pudieron actualizar las mesas. Se muestran los últimos datos.</Texto>}
          <Lista key={filtro} datos={visibles} clave={(mesa) => mesa.id} vacio="No hay mesas en este estado."
            mostrar={(mesa) => (
              <Tarjeta titulo={rotuloMesa(mesa)} icono="mesa">
                <EstadoRegistro texto={textos[mesa.actas]} tono={tonos[mesa.actas]} />
                {mesa.es_simulacion && <Texto>Mesa de simulación</Texto>}
                {mesa.actas > 0 && (
                  <Enlace href={{ pathname: '/actas-provinciales', params: {
                    mesa: String(mesa.id), origen: 'seguimiento', recinto: String(recintoId), dignidad,
                  } }} texto="Consultar actas y evidencias" icono="actas" centrado />
                )}
              </Tarjeta>
            )} />
        </EstadoConsulta>
      )}
    </Tarjeta>
  );
}
