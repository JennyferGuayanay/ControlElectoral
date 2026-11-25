import { Boton } from '@/modulos/acceso/presentacion/interfaz';

import type { RepositorioOperacion } from '../aplicacion/operacion';
import { DetalleMesa, EstadoConsulta, fechaLocal, Pantalla, Tarjeta, Texto, useConsulta } from './componentes';

export function PantallaMiMesa({ repositorio, veedorId }: { repositorio: RepositorioOperacion; veedorId: string }) {
  const asignacion = useConsulta(['mi-mesa'], () => repositorio.miMesa(veedorId));
  const mesa = asignacion.data?.mesa;
  const recinto = mesa?.recinto;
  const parroquia = recinto?.parroquia;

  return (
    <Pantalla titulo="Mi asignación" inicio="/veedor">
      <Boton titulo="Actualizar mi mesa" variante="secundario" cargando={asignacion.isFetching}
        alPulsar={() => { void asignacion.refetch(); }} />
      <EstadoConsulta consulta={asignacion}>
        {mesa ? (
          <Tarjeta titulo={recinto?.nombre ?? 'Mesa asignada'}>
            <DetalleMesa mesa={mesa} />
            {parroquia && <Texto>Parroquia {parroquia.nombre}</Texto>}
            {parroquia?.canton && <Texto>Cantón {parroquia.canton.nombre}</Texto>}
            {!!recinto?.zona && <Texto>Zona {recinto.zona}</Texto>}
            {!!recinto?.direccion && <Texto>{recinto.direccion}</Texto>}
            {asignacion.data && <Texto>Asignada desde {fechaLocal(asignacion.data.desde)}</Texto>}
          </Tarjeta>
        ) : <Tarjeta titulo="Sin mesa asignada"><Texto>Consulta con tu coordinador de recinto.</Texto></Tarjeta>}
      </EstadoConsulta>
    </Pantalla>
  );
}
