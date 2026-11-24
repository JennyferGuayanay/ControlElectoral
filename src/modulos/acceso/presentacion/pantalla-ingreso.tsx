import { useForm } from '@tanstack/react-form';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { esquemaIngreso } from '../dominio/acceso';
import {
  Aviso, Boton, Campo, colores, Encabezado, Enlace, errorDeCampo, Marco,
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
    <Marco>
      <View style={estilos.jurisdiccion}>
        <View pointerEvents="none" style={estilos.marcas} importantForAccessibility="no-hide-descendants">
          <View style={[estilos.diagonal, estilos.diagonalUno]} />
          <View style={[estilos.diagonal, estilos.diagonalDos]} />
          <View style={[estilos.diagonal, estilos.diagonalTres]} />
        </View>
        <Text style={estilos.ubicacion}>Imbabura / Cotacachi</Text>
        <Text style={estilos.nombreJornada}>Escrutinio electoral</Text>
      </View>
      <Encabezado titulo="Iniciar sesión" detalle="Entra con tu correo registrado y tu contraseña." />
      <Panel>
        <formulario.Subscribe selector={(estado) => estado.isSubmitting}>
          {(ingresando) => (
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
                    editable={!ingresando}
                    error={errorDeCampo(campo.state.meta.errors)}
                  />
                )}
              </formulario.Field>
              <formulario.Field name="clave">
                {(campo) => (
                  <Campo
                    etiqueta="Contraseña"
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
                titulo="Entrar"
                tituloCarga="Comprobando acceso…"
                cargando={ingresando}
                alPulsar={() => void formulario.handleSubmit()}
              />
              {!ingresando && <Enlace href="/recuperar" texto="Olvidé mi contraseña" />}
            </>
          )}
        </formulario.Subscribe>
      </Panel>
    </Marco>
  );
}

const estilos = StyleSheet.create({
  jurisdiccion: {
    backgroundColor: colores.azul, paddingVertical: 17, paddingHorizontal: 18, gap: 5,
    overflow: 'hidden', borderRadius: 13, borderLeftWidth: 6, borderLeftColor: colores.amarillo,
  },
  ubicacion: { color: '#F9D95E', fontSize: 14, fontWeight: '700', letterSpacing: 0.6 },
  nombreJornada: { color: colores.blanco, fontSize: 23, fontWeight: '700', maxWidth: '85%' },
  marcas: { position: 'absolute', top: -50, right: -23, width: 164, height: 190 },
  diagonal: { position: 'absolute', height: 205, transform: [{ rotate: '37deg' }], borderRadius: 4 },
  diagonalUno: { width: 20, right: 26, backgroundColor: '#234A80' },
  diagonalDos: { width: 9, right: 56, backgroundColor: '#2C548B' },
  diagonalTres: { width: 3, right: 78, backgroundColor: '#386097' },
});
