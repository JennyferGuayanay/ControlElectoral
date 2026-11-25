import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

import { Aviso, Boton, mensajeDeError, type Mensaje } from '@/modulos/acceso/presentacion/interfaz';

import { coincideBusqueda, nombreCompleto, type Cuenta, type Vigencia } from '../dominio/operacion';
import { CampoGestion, EstadoRegistro, fechaLocal, Historial, Lista, Tarjeta, Texto, useActualizar } from './componentes';

export function CambioVigencia({
  registros, candidatos, guardar, tipo,
}: {
  registros: Vigencia[]; candidatos: Cuenta[]; guardar(id: string, vigenteId?: number): Promise<void>;
  tipo: 'veedor' | 'coordinador';
}) {
  const vigente = registros.find(({ hasta }) => hasta === null);
  const [busqueda, fijarBusqueda] = useState('');
  const [abierto, fijarAbierto] = useState(false);
  const [seleccion, fijarSeleccion] = useState<string | null>(null);
  const [mensaje, fijarMensaje] = useState<Mensaje>();
  const actualizar = useActualizar();
  const mutacion = useMutation({
    mutationFn: ({ id, vigenteId }: { id: string; vigenteId: number | undefined }) => guardar(id, vigenteId),
    gcTime: 0,
    onSettled: actualizar,
  });

  const disponibles = candidatos.filter((cuenta) => cuenta.usuario_id !== vigente?.responsable_id);
  const persona = disponibles.find(({ usuario_id }) => usuario_id === seleccion);
  const accion = vigente ? 'Reemplazar' : 'Asignar';

  async function confirmar() {
    if (!persona) return;
    fijarMensaje(undefined);
    try {
      await mutacion.mutateAsync({ id: persona.usuario_id, vigenteId: vigente?.id });
      fijarSeleccion(null);
      fijarBusqueda('');
      fijarAbierto(false);
      fijarMensaje({ tipo: 'exito', texto: vigente ? 'Reemplazo registrado en el historial.' : 'Asignación registrada correctamente.' });
    } catch (error) {
      fijarSeleccion(null);
      fijarMensaje(mensajeDeError(error, 'No pudimos guardar el cambio.'));
    }
  }

  return (
    <>
      <Tarjeta titulo={tipo === 'veedor' ? 'Veeduría vigente' : 'Coordinación vigente'} icono="persona">
        <EstadoRegistro
          texto={vigente ? (tipo === 'veedor' ? 'Mesa asignada' : 'Coordinador asignado') : (tipo === 'veedor' ? 'Mesa disponible' : 'Sin coordinador')}
          tono={vigente ? 'positivo' : 'alerta'}
        />
        {vigente ? (
          <>
            <Texto destacado>{vigente.responsable ? nombreCompleto(vigente.responsable) : 'Responsable sin detalle visible'}</Texto>
            <Texto>Desde {fechaLocal(vigente.desde)}</Texto>
          </>
        ) : <Texto>Aún no hay una persona asignada.</Texto>}
        {disponibles.length === 0 && (
          <Texto>{tipo === 'veedor' ? 'No hay veedores habilitados y libres en este recinto.' : 'No hay otro coordinador habilitado disponible.'}</Texto>
        )}
        <Boton titulo={abierto ? 'Cerrar selección' : `${accion} ${tipo}`}
          icono="persona"
          deshabilitado={mutacion.isPending || (!abierto && !disponibles.length)}
          alPulsar={() => { fijarAbierto(!abierto); fijarSeleccion(null); fijarMensaje(undefined); }} />
        {abierto && !persona && (
          <>
            <CampoGestion etiqueta={`Buscar ${tipo}`} value={busqueda} onChangeText={fijarBusqueda} icono="persona" />
            <Lista datos={disponibles.filter((cuenta) => coincideBusqueda(busqueda, nombreCompleto(cuenta)))}
              clave={(cuenta) => cuenta.usuario_id} vacio="No hay personas que coincidan con la búsqueda."
              mostrar={(cuenta) => <Boton titulo={nombreCompleto(cuenta)} variante="secundario"
                alPulsar={() => fijarSeleccion(cuenta.usuario_id)} />} />
          </>
        )}
        {abierto && persona && (
          <>
            <Aviso mensaje={{ tipo: 'info', texto: `${accion} a ${nombreCompleto(persona)}.` }} />
            {vigente && <Texto>El período anterior quedará en el historial.</Texto>}
            <Boton titulo={vigente ? 'Confirmar reemplazo' : 'Confirmar asignación'}
              cargando={mutacion.isPending} alPulsar={() => void confirmar()} />
            <Boton titulo="Elegir otra persona" variante="secundario"
              deshabilitado={mutacion.isPending} alPulsar={() => fijarSeleccion(null)} />
          </>
        )}
        <Aviso mensaje={mensaje} />
      </Tarjeta>
      <Tarjeta titulo={tipo === 'veedor' ? 'Historial de asignaciones' : 'Historial de coordinaciones'} icono="coordinacion">
        <Historial registros={registros} />
      </Tarjeta>
    </>
  );
}
