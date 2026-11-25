import { useState } from 'react';

import { Boton, Campo, Enlace } from '@/modulos/acceso/presentacion/interfaz';

import type { RepositorioOperacion } from '../aplicacion/operacion';
import { coincideBusqueda, rotuloMesa, veedoresDisponibles } from '../dominio/operacion';
import { CambioVigencia } from './cambio-vigencia';
import { DetalleMesa, EstadoConsulta, Lista, Pantalla, SelectorRecinto, Tarjeta, useConsulta } from './componentes';

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

function MesasRecinto({ repositorio, recintoId }: { repositorio: RepositorioOperacion; recintoId: number }) {
  const [mesaId, fijarMesa] = useState<number | null>(null);
  const [buscar, fijarBuscar] = useState('');
  const mesas = useConsulta(['mesas', recintoId], () => repositorio.mesas(recintoId));
  const visibles = (mesas.data ?? []).filter((mesa) => coincideBusqueda(buscar, rotuloMesa(mesa)));

  return (
    <EstadoConsulta consulta={mesas}>
      <Campo etiqueta="Buscar mesa del recinto" value={buscar} onChangeText={fijarBuscar} />
      <Lista datos={visibles} clave={(mesa) => mesa.id} vacio="No hay mesas que mostrar."
        mostrar={(mesa) => (
          <Tarjeta titulo={`Mesa ${mesa.numero_jrv_cne ?? mesa.numero}`}>
            <DetalleMesa mesa={mesa} />
            <Enlace href={{ pathname: '/actas-recinto', params: { mesa: String(mesa.id) } }} texto="Consultar actas de esta mesa" />
            <Boton titulo={mesaId === mesa.id ? 'Ocultar asignaciones' : 'Gestionar asignación'} variante="secundario"
              alPulsar={() => fijarMesa(mesaId === mesa.id ? null : mesa.id)} />
            {mesaId === mesa.id && <AsignacionesMesa repositorio={repositorio} recintoId={recintoId} mesaId={mesa.id} />}
          </Tarjeta>
        )} />
    </EstadoConsulta>
  );
}

export function PantallaMesas({ repositorio }: { repositorio: RepositorioOperacion }) {
  const [elegido, fijarRecinto] = useState<number | null>(null);
  const recintos = useConsulta(['recintos'], repositorio.recintos);
  const lista = recintos.data ?? [];
  const recintoId = lista.some(({ id }) => id === elegido) ? elegido : lista.length === 1 ? lista[0].id : null;

  return (
    <Pantalla titulo="Mesas y asignaciones" detalle="Asigna un veedor por mesa y consulta el historial." inicio="/recinto">
      <EstadoConsulta consulta={recintos}>
        <SelectorRecinto recintos={lista} recintoId={recintoId} elegir={fijarRecinto} />
        {recintoId !== null && <MesasRecinto key={recintoId} repositorio={repositorio} recintoId={recintoId} />}
      </EstadoConsulta>
    </Pantalla>
  );
}
