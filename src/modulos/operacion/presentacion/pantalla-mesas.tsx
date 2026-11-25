import { useState } from 'react';

import { Boton, Enlace } from '@/modulos/acceso/presentacion/interfaz';

import type { RepositorioOperacion } from '../aplicacion/operacion';
import { coincideBusqueda, rotuloMesa, veedoresDisponibles } from '../dominio/operacion';
import { CambioVigencia } from './cambio-vigencia';
import { CampoGestion, DetalleMesa, EstadoConsulta, EstadoRegistro, Lista, Pantalla, SelectorRecinto, Tarjeta, Texto, useConsulta } from './componentes';

type VistaMesas = 'asignaciones' | 'actas' | 'reemplazos';

const encabezados = {
  asignaciones: { titulo: 'Mesas y asignaciones', detalle: 'Asigna un veedor por mesa y consulta el historial.' },
  actas: { titulo: 'Consulta de actas', detalle: 'Selecciona una mesa del recinto para ver sus actas.' },
  reemplazos: { titulo: 'Reemplazos e historial', detalle: 'Selecciona una mesa para gestionar un reemplazo o consultar su historial.' },
};

function AsignacionesMesa({
  repositorio, recintoId, mesaId,
}: { repositorio: RepositorioOperacion; recintoId: number; mesaId: number }) {
  const historial = useConsulta(['asignaciones', mesaId], () => repositorio.asignaciones(mesaId));
  const cuentas = useConsulta(['cuentas', 'veedor', recintoId], () => repositorio.cuentas('veedor', recintoId));
  const ocupados = useConsulta(['veedores-ocupados', recintoId], () => repositorio.veedoresOcupados(recintoId));

  return (
    <>
      <Boton titulo="Actualizar asignaciones" variante="secundario"
        cargando={historial.isRefetching || cuentas.isRefetching || ocupados.isRefetching}
        alPulsar={() => { void historial.refetch(); void cuentas.refetch(); void ocupados.refetch(); }} />
      <EstadoConsulta consulta={historial}>
        <EstadoConsulta consulta={cuentas}>
          <EstadoConsulta consulta={ocupados}>
            <CambioVigencia registros={historial.data ?? []} tipo="veedor"
              candidatos={veedoresDisponibles(cuentas.data ?? [], ocupados.data ?? new Set(), recintoId)}
              guardar={(id, vigenteId) => repositorio.asignarVeedor(mesaId, id, vigenteId)} />
          </EstadoConsulta>
        </EstadoConsulta>
      </EstadoConsulta>
    </>
  );
}

function MesasRecinto({ repositorio, recintoId, vista }: {
  repositorio: RepositorioOperacion; recintoId: number; vista: VistaMesas;
}) {
  const [mesaId, fijarMesa] = useState<number | null>(null);
  const [buscar, fijarBuscar] = useState('');
  const mesas = useConsulta(['mesas', recintoId], () => repositorio.mesas(recintoId));
  const visibles = (mesas.data ?? []).filter((mesa) => coincideBusqueda(buscar, rotuloMesa(mesa)));

  return (
    <EstadoConsulta consulta={mesas}>
      <CampoGestion etiqueta="Buscar mesa del recinto" value={buscar} onChangeText={fijarBuscar} icono="mesa" />
      <EstadoRegistro texto={`Mesas encontradas: ${visibles.length}`} tono="neutro" />
      <Lista datos={visibles} clave={(mesa) => mesa.id} vacio="No hay mesas que mostrar."
        mostrar={(mesa) => {
          const expandida = mesaId === mesa.id;
          return (
            <Tarjeta titulo={`Mesa ${mesa.numero_jrv_cne ?? mesa.numero}`} icono="mesa">
              <DetalleMesa mesa={mesa} />
              {vista !== 'reemplazos' && (
                <Enlace href={{
                  pathname: '/actas-recinto',
                  params: { mesa: String(mesa.id), ...(vista === 'actas' && { origen: 'actas' }) },
                }}
                  texto="Consultar actas de esta mesa" />
              )}
              {vista !== 'actas' && (
                <>
                  <Boton titulo={expandida ? 'Ocultar asignaciones' : vista === 'reemplazos' ? 'Ver reemplazos e historial' : 'Gestionar asignación'}
                    variante="secundario" icono="persona" alPulsar={() => fijarMesa(expandida ? null : mesa.id)} />
                  {expandida && <AsignacionesMesa repositorio={repositorio} recintoId={recintoId} mesaId={mesa.id} />}
                </>
              )}
            </Tarjeta>
          );
        }} />
    </EstadoConsulta>
  );
}

export function PantallaMesas({ repositorio, vista = 'asignaciones' }: {
  repositorio: RepositorioOperacion; vista?: VistaMesas;
}) {
  const [elegido, fijarRecinto] = useState<number | null>(null);
  const recintos = useConsulta(['recintos'], repositorio.recintos);
  const lista = recintos.data ?? [];
  const recinto = lista.find(({ id }) => id === elegido) ?? (lista.length === 1 ? lista[0] : undefined);

  return (
    <Pantalla {...encabezados[vista]} inicio="/recinto" iconoGestion={vista === 'actas' ? undefined : 'mesa'}>
      <EstadoConsulta consulta={recintos}>
        <SelectorRecinto recintos={lista} recintoId={recinto?.id ?? null} elegir={fijarRecinto} />
        {recinto && (
          <>
            {vista === 'asignaciones' && (recinto.direccion || recinto.zona) && (
              <Tarjeta titulo="Información del recinto" icono="ubicacion">
                <Texto destacado>{recinto.nombre}</Texto>
                {!!recinto.direccion && <Texto>{recinto.direccion}</Texto>}
                {!!recinto.zona && <Texto>Zona {recinto.zona}</Texto>}
              </Tarjeta>
            )}
            <MesasRecinto key={recinto.id} repositorio={repositorio} recintoId={recinto.id} vista={vista} />
          </>
        )}
      </EstadoConsulta>
    </Pantalla>
  );
}
