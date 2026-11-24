import { useForm } from '@tanstack/react-form';
import { useState } from 'react';

import type { RecuperacionVerificada } from '../aplicacion/acceso';
import { esquemaCorreo } from '../dominio/acceso';
import { FormularioClave, FormularioCodigo } from './formularios';
import {
  Aviso, Boton, Campo, Encabezado, Enlace, errorDeCampo, Marco, mensajeDeError, Panel, type Mensaje,
} from './interfaz';
import { useAcceso } from './proveedor-acceso';

type Paso =
  | { tipo: 'correo' }
  | { tipo: 'codigo'; correo: string }
  | { tipo: 'clave'; recuperacion: RecuperacionVerificada }
  | { tipo: 'fin' };

export default function PantallaRecuperacion() {
  const { repositorio } = useAcceso();
  const [paso, fijarPaso] = useState<Paso>({ tipo: 'correo' });
  const [mensaje, fijarMensaje] = useState<Mensaje>();
  const [operacion, fijarOperacion] = useState<'enviar' | 'verificar'>();
  const formulario = useForm({
    defaultValues: { correo: '' },
    validators: { onChange: esquemaCorreo, onSubmit: esquemaCorreo },
    onSubmit: ({ value }) => enviar(esquemaCorreo.parse(value).correo),
  });

  async function enviar(correo: string) {
    fijarOperacion('enviar');
    fijarMensaje(undefined);
    try {
      await repositorio.enviarCodigoRecuperacion(correo);
      fijarPaso({ tipo: 'codigo', correo });
      fijarMensaje({
        tipo: 'info',
        texto: 'Si el correo tiene una cuenta habilitada, recibirás un código. Revisa también el correo no deseado.',
      });
    } catch (error) {
      fijarMensaje(mensajeDeError(error, 'No pudimos solicitar el código.'));
    } finally {
      fijarOperacion(undefined);
    }
  }

  async function verificar(codigo: string) {
    if (paso.tipo !== 'codigo') return;
    fijarOperacion('verificar');
    fijarMensaje(undefined);
    try {
      const recuperacion = await repositorio.verificarCodigoRecuperacion(paso.correo, codigo);
      fijarPaso({ tipo: 'clave', recuperacion });
    } catch (error) {
      fijarMensaje(mensajeDeError(error, 'No pudimos verificar el código.'));
    } finally {
      fijarOperacion(undefined);
    }
  }

  async function guardar(clave: string) {
    if (paso.tipo !== 'clave') return;
    fijarMensaje(undefined);
    try {
      await paso.recuperacion.cambiarClave(clave);
      fijarPaso({ tipo: 'fin' });
    } catch (error) {
      fijarMensaje(mensajeDeError(error, 'No pudimos guardar la contraseña.'));
    }
  }

  function cambiarCorreo() {
    fijarPaso({ tipo: 'correo' });
    fijarMensaje(undefined);
  }

  return (
    <Marco>
      {paso.tipo === 'correo' && (
        <Encabezado
          titulo="Recupera tu contraseña"
          detalle="Escribe el correo de tu cuenta para solicitar un código de recuperación."
        />
      )}
      {paso.tipo === 'codigo' && (
        <Encabezado
          titulo="Verifica el código"
          detalle={`Ingresa el código de recuperación para ${paso.correo}.`}
        />
      )}
      {paso.tipo === 'clave' && (
        <Encabezado titulo="Elige una nueva contraseña" detalle="Usa al menos 8 caracteres y elige una distinta de la anterior." />
      )}
      {paso.tipo === 'fin' && <Encabezado titulo="Contraseña actualizada" />}
      <Panel>
        <Aviso mensaje={mensaje} />
        {paso.tipo === 'correo' && (
          <formulario.Subscribe selector={(estado) => estado.isSubmitting}>
            {(enviando) => (
              <>
                <formulario.Field name="correo">
                  {(campo) => (
                    <Campo
                      etiqueta="Correo electrónico"
                      value={campo.state.value}
                      onBlur={campo.handleBlur}
                      onChangeText={campo.handleChange}
                      autoComplete="email"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!enviando}
                      returnKeyType="done"
                      onSubmitEditing={() => void formulario.handleSubmit()}
                      error={errorDeCampo(campo.state.meta.errors)}
                    />
                  )}
                </formulario.Field>
                <Boton
                  titulo="Enviar código"
                  tituloCarga="Enviando código…"
                  cargando={enviando}
                  alPulsar={() => void formulario.handleSubmit()}
                />
              </>
            )}
          </formulario.Subscribe>
        )}
        {paso.tipo === 'codigo' && (
          <>
            <FormularioCodigo verificar={verificar} bloqueado={operacion === 'enviar'} />
            <Boton
              titulo="Enviar otro código"
              tituloCarga="Enviando código…"
              variante="secundario"
              cargando={operacion === 'enviar'}
              deshabilitado={operacion === 'verificar'}
              alPulsar={() => void enviar(paso.correo)}
            />
            <Boton
              titulo="Cambiar correo"
              variante="secundario"
              deshabilitado={!!operacion}
              alPulsar={cambiarCorreo}
            />
          </>
        )}
        {paso.tipo === 'clave' && <FormularioClave guardar={guardar} />}
        {paso.tipo === 'fin' && (
          <Aviso mensaje={{ tipo: 'exito', texto: 'Ya puedes iniciar sesión con tu nueva contraseña.' }} />
        )}
      </Panel>
      <Enlace href="/ingresar" texto="Volver a iniciar sesión" reemplazar />
    </Marco>
  );
}
