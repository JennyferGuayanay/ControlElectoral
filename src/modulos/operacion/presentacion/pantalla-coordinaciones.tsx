import { useState } from 'react';

import { Boton } from '@/modulos/acceso/presentacion/interfaz';

import type { RepositorioOperacion } from '../aplicacion/operacion';
import { CambioVigencia } from './cambio-vigencia';
import { EstadoConsulta, Pantalla, SelectorRecinto, useConsulta } from './componentes';

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

  return (
    <Pantalla titulo="Coordinación de recintos" detalle="Consulta el responsable actual y sus períodos de vigencia." inicio="/provincial">
      <EstadoConsulta consulta={recintos}>
        <SelectorRecinto recintos={lista} recintoId={recintoId} elegir={fijarRecinto} />
        {recintoId !== null && lista.some(({ id }) => id === recintoId) && (
          <Coordinacion key={recintoId} repositorio={repositorio} recintoId={recintoId} />
        )}
      </EstadoConsulta>
    </Pantalla>
  );
}
