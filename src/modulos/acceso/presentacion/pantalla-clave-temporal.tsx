import { useState } from 'react';

import { CierreSesion } from './cierre-sesion';
import { FormularioClave } from './formularios';
import { Aviso, Encabezado, Marco, mensajeDeError, Panel, type Mensaje } from './interfaz';
import { useAcceso } from './proveedor-acceso';

export default function PantallaClaveTemporal() {
  const { estado, repositorio, sesion, confirmarCambio, revisar } = useAcceso();
  const [mensaje, fijarMensaje] = useState<Mensaje>();
  const [guardada, fijarGuardada] = useState(false);

  if (estado.tipo !== 'clave-temporal' || !sesion) return null;
  const sesionActual = sesion;

  async function guardar(clave: string) {
    fijarMensaje(undefined);
    try {
      await repositorio.cambiarClaveTemporal(sesionActual, clave);
      fijarGuardada(true);
      confirmarCambio();
    } catch (error) {
      fijarMensaje(mensajeDeError(error, 'No pudimos guardar la contraseña.'));
      revisar();
    }
  }

  return (
    <Marco>
      <Encabezado
        titulo="Crea tu contraseña personal"
        detalle="Cambia la contraseña temporal para continuar. Usa al menos 8 caracteres y elige una distinta."
      />
      <Panel>
        <Aviso mensaje={mensaje} />
        {guardada ? (
          <Aviso mensaje={{ tipo: 'exito', texto: 'Contraseña guardada. Estamos comprobando tu acceso.' }} />
        ) : (
          <FormularioClave guardar={guardar} />
        )}
      </Panel>
      <CierreSesion />
    </Marco>
  );
}
