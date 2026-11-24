import { useState } from 'react';

import { CierreSesion } from './cierre-sesion';
import { FormularioCodigo } from './formularios';
import { Aviso, Boton, Encabezado, Marco, mensajeDeError, Panel, type Mensaje } from './interfaz';
import { useAcceso } from './proveedor-acceso';

export default function PantallaVerificarCorreo() {
  const { estado, repositorio, revisar } = useAcceso();
  const [enviado, fijarEnviado] = useState(false);
  const [operacion, fijarOperacion] = useState<'enviar' | 'verificar'>();
  const [mensaje, fijarMensaje] = useState<Mensaje>();

  if (estado.tipo !== 'correo') return null;
  const correo = estado.perfil.correo;

  async function enviar() {
    fijarOperacion('enviar');
    fijarMensaje(undefined);
    try {
      await repositorio.enviarCodigoCorreo(correo);
      fijarEnviado(true);
      fijarMensaje({ tipo: 'exito', texto: 'Código enviado. Revisa tu bandeja de entrada y el correo no deseado.' });
    } catch (error) {
      fijarMensaje(mensajeDeError(error, 'No pudimos enviar el código.'));
    } finally {
      fijarOperacion(undefined);
    }
  }

  async function verificar(codigo: string) {
    fijarOperacion('verificar');
    fijarMensaje(undefined);
    try {
      await repositorio.verificarCodigoCorreo(correo, codigo);
      revisar();
    } catch (error) {
      fijarMensaje(mensajeDeError(error, 'No pudimos verificar el código.'));
    } finally {
      fijarOperacion(undefined);
    }
  }

  return (
    <Marco>
      <Encabezado titulo="Verifica tu correo" detalle={`Envía un código a ${correo} para confirmar que el correo te pertenece.`} />
      <Panel>
        <Aviso mensaje={mensaje} />
        {enviado && <FormularioCodigo verificar={verificar} bloqueado={operacion === 'enviar'} />}
        <Boton
          titulo={enviado ? 'Enviar otro código' : 'Enviar código'}
          tituloCarga="Enviando código…"
          variante={enviado ? 'secundario' : 'principal'}
          cargando={operacion === 'enviar'}
          deshabilitado={operacion === 'verificar'}
          alPulsar={() => void enviar()}
        />
      </Panel>
      <CierreSesion />
    </Marco>
  );
}
