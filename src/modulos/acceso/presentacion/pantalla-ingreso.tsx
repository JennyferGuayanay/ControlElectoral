import { useForm } from '@tanstack/react-form';
import { useState } from 'react';

import { esquemaIngreso } from '../dominio/acceso';
import {
  Aviso, Boton, Campo, Enlace, errorDeCampo, Marco,
  mensajeDeError, Panel, type Mensaje,
} from './interfaz';

import { useAcceso } from './proveedor-acceso';

export default function PantallaIngreso() {
  const { repositorio } = useAcceso();
  const [mensaje, fijarMensaje] = useState<Mensaje>();
  const formulario = useForm({
    defaultValues: { correo: '', clave: '' },
    validators: { onChange: esquemaIngreso, onSubmit: esquemaIngreso },
    async onSubmit({ value }) {
      fijarMensaje(undefined);
      try {
        const datos = esquemaIngreso.parse(value);
        await repositorio.iniciarSesion(datos.correo, datos.clave);
      } catch (error) {
        fijarMensaje(mensajeDeError(error, 'No pudimos iniciar sesión.'));
      }
    },
  });

  return (
    <Marco portada="ingreso">
      <Panel acceso>
        <formulario.Subscribe selector={(estado) => estado.isSubmitting}>
          {(ingresando) => (
            <>
              <formulario.Field name="correo">
                {(campo) => (
                  <Campo
                    etiqueta="Correo electrónico"
                    integrado
                    icono="correo"
                    value={campo.state.value}
                    onBlur={campo.handleBlur}
                    onChangeText={campo.handleChange}
                    autoComplete="email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!ingresando}
                    error={errorDeCampo(campo.state.meta.errors)}
                  />
                )}
              </formulario.Field>
              <formulario.Field name="clave">
                {(campo) => (
                  <Campo
                    etiqueta="Contraseña"
                    integrado
                    value={campo.state.value}
                    onBlur={campo.handleBlur}
                    onChangeText={campo.handleChange}
                    autoComplete="current-password"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!ingresando}
                    esClave
                    returnKeyType="done"
                    onSubmitEditing={() => void formulario.handleSubmit()}
                    error={errorDeCampo(campo.state.meta.errors)}
                  />
                )}
              </formulario.Field>
              <Aviso mensaje={mensaje} />
              <Boton
                acceso
                titulo="Iniciar sesión"
                icono="ingreso"
                tituloCarga="Comprobando acceso…"
                cargando={ingresando}
                alPulsar={() => void formulario.handleSubmit()}
              />
              {!ingresando && (
                <Enlace href="/recuperar" texto="Recuperar contraseña" icono="llave" centrado />
              )}
            </>
          )}
        </formulario.Subscribe>
      </Panel>
    </Marco>
  );
}
