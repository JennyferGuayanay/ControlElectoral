import { useState } from 'react';

import { Aviso, Boton, mensajeDeError, type Mensaje } from './interfaz';

import { useAcceso } from './proveedor-acceso';

export function CierreSesion({ acceso }: { acceso?: boolean }) {
  const { repositorio } = useAcceso();
  const [cerrando, fijarCerrando] = useState(false);
  const [mensaje, fijarMensaje] = useState<Mensaje>();

  async function salir() {
    fijarCerrando(true);
    fijarMensaje(undefined);
    try {
      await repositorio.cerrarSesion();
    } catch (error) {
      fijarMensaje(mensajeDeError(error, 'No pudimos cerrar la sesión.'));
    } finally {
      fijarCerrando(false);
    }
  }

  return (
    <>
      <Aviso mensaje={mensaje} />
      <Boton
        acceso={acceso}
        titulo="Cerrar sesión"
        tituloCarga="Cerrando sesión…"
        cargando={cerrando}
        variante="secundario"
        alPulsar={() => void salir()}
      />
    </>
  );
}
