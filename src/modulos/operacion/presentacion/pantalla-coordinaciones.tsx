import { useState } from 'react';

import { Boton } from '@/modulos/acceso/presentacion/interfaz';

import type { RepositorioOperacion } from '../aplicacion/operacion';
import { CambioVigencia } from './cambio-vigencia';
import { EstadoConsulta, Pantalla, ResumenGestion, SelectorRecinto, Tarjeta, Texto, useConsulta } from './componentes';

function Coordinacion({ repositorio, recintoId }: { repositorio: RepositorioOperacion; recintoId: number }) {
  const historial = useConsulta(['coordinaciones', recintoId], () => repositorio.coordinaciones(recintoId));
  const cuentas = useConsulta(['cuentas', 'recinto', 0], () => repositorio.cuentas('recinto'));

  return (
    <>
      <Boton titulo="Actualizar coordinación" variante="secundario" cargando={historial.isRefetching || cuentas.isRefetching}
        alPulsar={() => { void historial.refetch(); void cuentas.refetch(); }} />
      <EstadoConsulta consulta={historial}>
        <EstadoConsulta consulta={cuentas}>
          <CambioVigencia registros={historial.data ?? []} candidatos={(cuentas.data ?? []).filter((cuenta) => cuenta.activo)}
            tipo="coordinador" guardar={(id) => repositorio.coordinarRecinto(recintoId, id)} />
        </EstadoConsulta>
      </EstadoConsulta>
    </>
  );
}

export function PantallaCoordinaciones({ repositorio }: { repositorio: RepositorioOperacion }) {
  const [recintoId, fijarRecinto] = useState<number | null>(null);
  const recintos = useConsulta(['recintos'], repositorio.recintos);
  const lista = recintos.data ?? [];
  const recinto = lista.find(({ id }) => id === recintoId);

  return (
    <Pantalla titulo="Coordinación de recintos" detalle="Responsables actuales y períodos de vigencia."
      inicio="/provincial" iconoGestion="coordinacion">
      <EstadoConsulta consulta={recintos}>
        <Tarjeta titulo="Recinto electoral" icono="ubicacion">
          <ResumenGestion datos={[{ etiqueta: 'Recintos disponibles', cantidad: lista.length, icono: 'territorio', tono: 'neutro' }]} />
          <SelectorRecinto recintos={lista} recintoId={recintoId} elegir={fijarRecinto} />
          {recinto?.zona && <Texto>Zona {recinto.zona}</Texto>}
          {recinto?.direccion && <Texto>{recinto.direccion}</Texto>}
        </Tarjeta>
        {recinto && (
          <Coordinacion key={recinto.id} repositorio={repositorio} recintoId={recinto.id} />
        )}
      </EstadoConsulta>
    </Pantalla>
  );
}
