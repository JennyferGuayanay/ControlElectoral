import { Link, type Href } from 'expo-router';
import { useState, type PropsWithChildren } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import AnimacionExito from './animacion-exito';

export const colores = {
  amarillo: '#F4C430',
  azul: '#163B70',
  rojo: '#D62839',
  fondo: '#F8F9FC',
  blanco: '#FFFFFF',
  texto: '#152840',
  secundario: '#465A71',
  borde: '#ACBACB',
  linea: '#DFE6EF',
  error: '#A01E2C',
  exito: '#166040',
};

const entrada = FadeInDown.duration(240).reduceMotion(ReduceMotion.System);

export function Marco({ children }: PropsWithChildren) {
  return (
    <SafeAreaView style={estilos.segura}>
      <View style={estilos.banda} accessible={false}>
        <View style={estilos.bandaAmarilla} />
        <View style={estilos.bandaAzul} />
        <View style={estilos.bandaRoja} />
      </View>
      <KeyboardAvoidingView
        style={estilos.pantalla}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={estilos.desplazamiento}>
          <View style={estilos.columna}>
            <View style={estilos.marca}>
              <View style={estilos.marcaIcono} importantForAccessibility="no-hide-descendants">
                <View style={estilos.marcaRayaLarga} />
                <View style={estilos.marcaRayaMedia} />
                <View style={estilos.marcaRayaCorta} />
              </View>
              <Text style={estilos.marcaNombre}>Control Electoral</Text>
            </View>
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Encabezado({ titulo, detalle }: { titulo: string; detalle?: string }) {
  return (
    <Animated.View entering={entrada} style={estilos.encabezado}>
      <View style={estilos.regla} accessible={false} />
      <Text accessibilityRole="header" style={estilos.titulo}>{titulo}</Text>
      {detalle && <Text style={estilos.detalle}>{detalle}</Text>}
    </Animated.View>
  );
}

export function Panel({ children }: PropsWithChildren) {
  return <View style={estilos.panel}>{children}</View>;
}

export type Mensaje = { tipo: 'error' | 'exito' | 'info'; texto: string };

export function Aviso({ mensaje }: { mensaje?: Mensaje | null }) {
  if (!mensaje) return null;

  return (
    <Animated.View entering={entrada} style={[
      estilos.aviso,
      mensaje.tipo === 'error' && estilos.avisoError,
      mensaje.tipo === 'exito' && estilos.avisoExito,
    ]}>
      {mensaje.tipo === 'exito' && <AnimacionExito />}
      <Text
        accessibilityRole={mensaje.tipo === 'error' ? 'alert' : 'text'}
        accessibilityLiveRegion={mensaje.tipo === 'error' ? 'assertive' : 'polite'}
        style={[
          estilos.avisoTexto,
          mensaje.tipo === 'error' && estilos.avisoTextoError,
          mensaje.tipo === 'exito' && estilos.avisoTextoExito,
        ]}>
        {mensaje.texto}
      </Text>
    </Animated.View>
  );
}

type CampoProps = TextInputProps & { etiqueta: string; error?: string; esClave?: boolean };

export function Campo({ etiqueta, error, esClave, style, ...props }: CampoProps) {
  const [mostrar, fijarMostrar] = useState(false);

  return (
    <View style={estilos.grupoCampo}>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
      <View style={[estilos.marcoCampo, !!error && estilos.marcoCampoError]}>
        <TextInput
          {...props}
          accessibilityLabel={etiqueta}
          accessibilityHint={error}
          placeholderTextColor={colores.secundario}
          secureTextEntry={esClave && !mostrar}
          style={[estilos.campo, style]}
        />
        {esClave && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={mostrar ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            onPress={() => fijarMostrar((anterior) => !anterior)}
            style={({ pressed }) => [estilos.verClave, pressed && estilos.presionado]}>
            <Text style={estilos.enlaceTexto}>{mostrar ? 'Ocultar' : 'Ver'}</Text>
          </Pressable>
        )}
      </View>
      {error && (
        <Text accessibilityLiveRegion="polite" style={estilos.errorCampo}>{error}</Text>
      )}
    </View>
  );
}

export function errorDeCampo(errores: readonly unknown[]): string | undefined {
  const error = errores[0];
  if (typeof error === 'string') return error;

  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
}

type BotonProps = {
  titulo: string;
  alPulsar(): void;
  cargando?: boolean;
  tituloCarga?: string;
  deshabilitado?: boolean;
  variante?: 'principal' | 'secundario';
};

export function Boton({
  titulo, alPulsar, cargando, tituloCarga, deshabilitado, variante = 'principal',
}: BotonProps) {
  const secundario = variante === 'secundario';
  const bloqueado = cargando || deshabilitado;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: cargando, disabled: !!bloqueado }}
      disabled={bloqueado}
      onPress={alPulsar}
      style={({ pressed }) => [
        estilos.boton,
        secundario && estilos.botonSecundario,
        (pressed || bloqueado) && estilos.presionado,
      ]}>
      {cargando && <ActivityIndicator color={secundario ? colores.azul : colores.blanco} />}
      <Text style={[estilos.botonTexto, secundario && estilos.botonTextoSecundario]}>
        {cargando && tituloCarga ? tituloCarga : titulo}
      </Text>
    </Pressable>
  );
}

export function Enlace({ href, texto, reemplazar }: { href: Href; texto: string; reemplazar?: boolean }) {
  return (
    <Link href={href} replace={reemplazar} asChild>
      <Pressable accessibilityRole="link" style={({ pressed }) => [estilos.enlace, pressed && estilos.presionado]}>
        <Text style={estilos.enlaceTexto}>{texto}</Text>
      </Pressable>
    </Link>
  );
}

export function mensajeDeError(error: unknown, alternativa: string): Mensaje {
  return { tipo: 'error', texto: error instanceof Error ? error.message : alternativa };
}

const estilos = StyleSheet.create({
  segura: { flex: 1, backgroundColor: colores.fondo },
  pantalla: { flex: 1 },
  banda: { height: 6, flexDirection: 'row' },
  bandaAmarilla: { flex: 2, backgroundColor: colores.amarillo },
  bandaAzul: { flex: 1, backgroundColor: colores.azul },
  bandaRoja: { flex: 1, backgroundColor: colores.rojo },
  desplazamiento: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 24, paddingBottom: 32 },
  columna: { width: '100%', maxWidth: 520, alignSelf: 'center', gap: 23 },
  marca: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  marcaIcono: {
    width: 42, height: 42, borderRadius: 9, backgroundColor: colores.azul,
    justifyContent: 'center', paddingHorizontal: 9, gap: 4,
  },
  marcaRayaLarga: { width: 24, height: 4, backgroundColor: colores.amarillo, borderRadius: 1 },
  marcaRayaMedia: { width: 18, height: 4, backgroundColor: colores.blanco, borderRadius: 1 },
  marcaRayaCorta: { width: 12, height: 4, backgroundColor: '#FD6C78', borderRadius: 1 },
  marcaNombre: { color: colores.azul, fontSize: 20, fontWeight: '800', flexShrink: 1 },
  encabezado: { gap: 10 },
  regla: { width: 37, height: 5, borderRadius: 2, backgroundColor: colores.amarillo },
  titulo: { color: colores.texto, fontSize: 33, fontWeight: '800', letterSpacing: -0.7 },
  detalle: { color: colores.secundario, fontSize: 17, lineHeight: 25 },
  panel: {
    backgroundColor: colores.blanco, borderWidth: 1, borderColor: colores.linea,
    borderRadius: 16, padding: 19, gap: 17,
  },
  grupoCampo: { gap: 7 },
  etiqueta: { color: colores.texto, fontSize: 17, fontWeight: '700' },
  marcoCampo: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colores.borde,
    borderRadius: 11, backgroundColor: colores.blanco, minHeight: 54,
  },
  marcoCampoError: { borderColor: colores.error, borderWidth: 2 },
  campo: {
    flex: 1, minWidth: 0, minHeight: 52, color: colores.texto, fontSize: 18,
    paddingVertical: 12, paddingHorizontal: 13,
  },
  verClave: { minWidth: 56, minHeight: 48, paddingHorizontal: 10, justifyContent: 'center', alignItems: 'center' },
  errorCampo: { color: colores.error, fontSize: 15, lineHeight: 21 },
  boton: {
    borderRadius: 11, minHeight: 54, paddingVertical: 13, paddingHorizontal: 15,
    backgroundColor: colores.azul, justifyContent: 'center', flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  botonSecundario: { backgroundColor: colores.blanco, borderWidth: 1, borderColor: colores.borde },
  botonTexto: { flexShrink: 1, color: colores.blanco, fontWeight: '700', fontSize: 17, textAlign: 'center' },
  botonTextoSecundario: { color: colores.azul },
  enlace: { alignSelf: 'flex-start', justifyContent: 'center', minHeight: 48 },
  enlaceTexto: { color: colores.azul, fontWeight: '700', textDecorationLine: 'underline', fontSize: 16 },
  aviso: {
    backgroundColor: '#EAF1FA', paddingHorizontal: 13, paddingVertical: 11, borderRadius: 9,
    borderLeftWidth: 4, borderLeftColor: colores.azul, flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  avisoError: { backgroundColor: '#FFF0F1', borderLeftColor: colores.rojo },
  avisoExito: { backgroundColor: '#EAF6EE', borderLeftColor: colores.exito },
  avisoTexto: { flex: 1, color: colores.azul, fontSize: 16, lineHeight: 23 },
  avisoTextoError: { color: colores.error },
  avisoTextoExito: { color: colores.exito, fontWeight: '600' },
  presionado: { opacity: 0.75 },
});
