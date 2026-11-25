import { Link, type Href } from 'expo-router';
import { useState, type PropsWithChildren, type ReactNode } from 'react';
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
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  CabeceraElectoral, FondoElectoral, IconoElectoral, OndaTricolor, type NombreIcono, type PortadaAcceso,
} from '@/compartido/presentacion/graficos-electorales';
import { colores, sombraTarjeta, superficieTarjeta } from '@/compartido/presentacion/tema-electoral';

import AnimacionExito from './animacion-exito';
import IndicadorConexion from './indicador-conexion';

export { colores };

const entrada = FadeInDown.duration(240).reduceMotion(ReduceMotion.System);

export function Marco({ children, portada, cabecera, ajustarTeclado }: PropsWithChildren<{
  portada?: PortadaAcceso; cabecera?: ReactNode; ajustarTeclado?: boolean;
}>) {
  return (
    <SafeAreaView style={estilos.segura}>
      <KeyboardAvoidingView
        style={estilos.pantalla}
        behavior={Platform.OS === 'ios' && !ajustarTeclado ? 'padding' : undefined}>
        <ScrollView
          automaticallyAdjustKeyboardInsets={ajustarTeclado}
          keyboardDismissMode={ajustarTeclado ? 'on-drag' : 'none'}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={estilos.desplazamiento}>
          {cabecera ?? <CabeceraElectoral portada={portada} />}
          <View style={estilos.cuerpo}>
            <FondoElectoral />
            <View style={[estilos.columna, portada && estilos.columnaPortada]}>
              {children}
              {portada && <IndicadorConexion />}
            </View>
            <OndaTricolor posicion="pie" amplia={!!portada || !!cabecera} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Encabezado({ titulo, detalle, compacto }: { titulo: string; detalle?: string; compacto?: boolean }) {
  return (
    <Animated.View entering={entrada} style={[estilos.encabezado, compacto && estilos.encabezadoCompacto]}>
      {!compacto && (
        <View style={estilos.regla} importantForAccessibility="no-hide-descendants">
          <View style={estilos.reglaAmarilla} />
          <View style={estilos.reglaAzul} />
          <View style={estilos.reglaRoja} />
        </View>
      )}
      <Text accessibilityRole="header" style={[estilos.titulo, compacto && estilos.tituloCompacto]}>{titulo}</Text>
      {detalle && <Text style={estilos.detalle}>{detalle}</Text>}
    </Animated.View>
  );
}

export function Panel({ children, acceso }: PropsWithChildren<{ acceso?: boolean }>) {
  if (acceso) {
    return <Animated.View entering={entrada} style={[estilos.panel, estilos.panelAcceso]}>{children}</Animated.View>;
  }
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
      {mensaje.tipo === 'exito'
        ? <AnimacionExito />
        : <IconoElectoral nombre={mensaje.tipo} color={mensaje.tipo === 'error' ? colores.error : colores.azulBrillante} />}
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

type CampoProps = TextInputProps & {
  etiqueta: string; error?: string; esClave?: boolean; icono?: NombreIcono; integrado?: boolean; acceso?: boolean;
};

export function Campo({
  etiqueta, error, esClave, icono, integrado, acceso, style, onBlur, onFocus, ...props
}: CampoProps) {
  const [mostrar, fijarMostrar] = useState(false);
  const [enFoco, fijarEnFoco] = useState(false);
  const iconoCampo = icono ?? (esClave ? 'clave' : undefined);
  const etiquetaFlotante = integrado && !!props.value;
  const estiloAcceso = integrado || acceso;

  return (
    <View style={estilos.grupoCampo}>
      {!integrado && <Text style={estilos.etiqueta}>{etiqueta}</Text>}
      <View style={[
        estilos.marcoCampo, estiloAcceso && estilos.marcoCampoAcceso,
        enFoco && estilos.marcoCampoFoco, !!error && estilos.marcoCampoError,
      ]}>
        {iconoCampo && (
          <View style={[estilos.iconoCampo, estiloAcceso && estilos.divisorCampo]}>
            <IconoElectoral nombre={iconoCampo} tamano={24} />
          </View>
        )}
        <View style={estilos.contenidoCampo}>
          {etiquetaFlotante && (
            <Text accessible={false} aria-hidden style={estilos.etiquetaCampoIntegrado}>{etiqueta}</Text>
          )}
          <TextInput
            {...props}
            accessibilityLabel={etiqueta}
            accessibilityHint={error}
            placeholder={integrado ? etiqueta : props.placeholder}
            placeholderTextColor={colores.secundario}
            secureTextEntry={esClave && !mostrar}
            onFocus={(evento) => { fijarEnFoco(true); onFocus?.(evento); }}
            onBlur={(evento) => { fijarEnFoco(false); onBlur?.(evento); }}
            style={[estilos.campo, estiloAcceso && estilos.campoAcceso, etiquetaFlotante && estilos.campoConEtiqueta, style]}
          />
        </View>
        {esClave && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={mostrar ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            accessibilityState={{ selected: mostrar }}
            onPress={() => fijarMostrar((anterior) => !anterior)}
            style={({ pressed }) => [estilos.verClave, pressed && estilos.presionado]}>
            <IconoElectoral nombre={mostrar ? 'ocultar' : 'ojo'} tamano={25} />
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
  variante?: 'principal' | 'secundario' | 'peligro' | 'exito';
  icono?: NombreIcono;
  acceso?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Boton({
  titulo, alPulsar, cargando, tituloCarga, deshabilitado, variante = 'principal', icono, acceso, style,
}: BotonProps) {
  const secundario = variante === 'secundario';
  const peligro = variante === 'peligro';
  const exito = variante === 'exito';
  const colorAccion = peligro ? colores.error : exito ? colores.exito : undefined;
  const bloqueado = cargando || deshabilitado;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: cargando, disabled: !!bloqueado }}
      disabled={bloqueado}
      onPress={alPulsar}
      style={({ pressed }) => [
        estilos.boton,
        acceso && estilos.botonAcceso,
        secundario && estilos.botonSecundario,
        acceso && secundario && estilos.botonAccesoSecundario,
        peligro && estilos.botonPeligro,
        exito && estilos.botonExito,
        style,
        (pressed || bloqueado) && estilos.presionado,
      ]}>
      {cargando && <ActivityIndicator color={colorAccion ?? colores.azul} />}
      {acceso && icono && !cargando && <IconoElectoral nombre={icono} tamano={26} />}
      <Text style={[
        estilos.botonTexto, secundario && estilos.botonTextoSecundario,
        acceso && !secundario && estilos.botonAccesoTexto,
        colorAccion && { color: colorAccion },
      ]}>
        {cargando && tituloCarga ? tituloCarga : titulo}
      </Text>
      {!acceso && icono && !cargando && <IconoElectoral nombre={icono} tamano={24} color={colorAccion} />}
    </Pressable>
  );
}

export function Enlace({ href, texto, reemplazar, icono, centrado }: {
  href: Href; texto: string; reemplazar?: boolean; icono?: NombreIcono; centrado?: boolean;
}) {
  const contenido = (
    <>
      {icono && <IconoElectoral nombre={icono} tamano={22} />}
      <Text style={[estilos.enlaceTexto, centrado && estilos.enlaceCentradoTexto,
        icono && !centrado && estilos.enlaceConIconoTexto]}>{texto}</Text>
    </>
  );

  return (
    <Link href={href} replace={reemplazar} asChild>
      <Pressable accessibilityRole="link" style={({ pressed }) => [
        estilos.enlace, centrado && estilos.enlaceCentrado, icono && !centrado && estilos.enlaceConIcono,
        pressed && estilos.presionado,
      ]}>
        {centrado ? <View style={estilos.contenidoEnlace}>{contenido}</View> : contenido}
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
  desplazamiento: { flexGrow: 1 },
  cuerpo: { flexGrow: 1 },
  columna: {
    flexGrow: 1, width: '100%', maxWidth: 620, alignSelf: 'center',
    paddingHorizontal: 18, paddingTop: 14, paddingBottom: 20, gap: 18,
  },
  columnaPortada: { maxWidth: 480, paddingHorizontal: 12, paddingTop: 2, paddingBottom: 5, gap: 13 },
  encabezado: { gap: 10 },
  encabezadoCompacto: { gap: 4 },
  regla: { flexDirection: 'row', width: 56, height: 6, borderRadius: 3, overflow: 'hidden' },
  reglaAmarilla: { flex: 2, backgroundColor: colores.amarillo },
  reglaAzul: { flex: 1, backgroundColor: colores.azulBrillante },
  reglaRoja: { flex: 1, backgroundColor: colores.rojo },
  titulo: { color: colores.texto, fontSize: 32, fontWeight: '900', letterSpacing: -0.5 },
  tituloCompacto: { fontSize: 22 },
  detalle: { color: colores.secundario, fontSize: 17, lineHeight: 25 },
  panel: { ...superficieTarjeta, padding: 16, gap: 13 },
  panelAcceso: { borderRadius: 25, paddingVertical: 18, paddingHorizontal: 14, gap: 14, borderColor: '#E4E9F7' },
  grupoCampo: { gap: 7 },
  etiqueta: { color: colores.texto, fontSize: 15, fontWeight: '700' },
  marcoCampo: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colores.borde,
    borderRadius: 12, backgroundColor: colores.fondo, minHeight: 50,
  },
  marcoCampoAcceso: { borderWidth: 1.5, borderRadius: 17, backgroundColor: '#F4F6FF', minHeight: 53 },
  marcoCampoFoco: { borderColor: colores.azulBrillante, backgroundColor: colores.blanco },
  marcoCampoError: { borderColor: colores.error, backgroundColor: colores.rojoSuave },
  iconoCampo: { marginLeft: 12 },
  divisorCampo: { borderRightWidth: 1, borderRightColor: colores.borde, paddingRight: 10 },
  contenidoCampo: { flex: 1, minWidth: 0 },
  etiquetaCampoIntegrado: {
    color: colores.secundario, fontSize: 12, fontWeight: '700', marginHorizontal: 10, marginTop: 3,
  },
  campo: {
    flex: 1, minWidth: 0, minHeight: 48, color: colores.texto, fontSize: 16,
    paddingVertical: 10, paddingHorizontal: 10,
  },
  campoAcceso: { fontSize: 17, minHeight: 50 },
  campoConEtiqueta: { paddingTop: 0, paddingBottom: 3, minHeight: 32 },
  verClave: { minWidth: 56, minHeight: 48, paddingHorizontal: 10, justifyContent: 'center', alignItems: 'center' },
  errorCampo: { color: colores.error, fontSize: 15, lineHeight: 21 },
  boton: {
    ...sombraTarjeta,
    borderRadius: 13, borderWidth: 1, borderColor: colores.azul, borderBottomWidth: 3,
    minHeight: 52, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: colores.amarillo,
    justifyContent: 'center', flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  botonSecundario: { backgroundColor: colores.azulSuave, borderColor: colores.azulBrillante, borderBottomWidth: 1 },
  botonPeligro: { backgroundColor: colores.rojoSuave, borderColor: colores.error, borderBottomWidth: 1 },
  botonExito: { backgroundColor: '#E5F5EB', borderColor: colores.exito, borderBottomWidth: 1 },
  botonAcceso: {
    backgroundColor: '#FFD015', borderRadius: 22, borderWidth: 2.5, borderBottomWidth: 4, minHeight: 58,
    boxShadow: '0px 4px 9px rgba(7, 36, 94, 0.18)',
  },
  botonAccesoSecundario: { borderColor: colores.azul, borderWidth: 1.5, minHeight: 50 },
  botonTexto: { flexShrink: 1, color: colores.azul, fontWeight: '800', fontSize: 18, textAlign: 'center' },
  botonTextoSecundario: { color: colores.azulBrillante },
  botonAccesoTexto: { fontSize: 21 },
  enlace: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48 },
  enlaceConIcono: {
    backgroundColor: colores.blanco, borderWidth: 1.5, borderColor: colores.linea,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8,
  },
  enlaceCentrado: { alignSelf: 'stretch', justifyContent: 'center' },
  contenidoEnlace: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 8, minHeight: 48, gap: 8,
  },
  enlaceCentradoTexto: { color: colores.azul, fontSize: 17, textAlign: 'center' },
  enlaceTexto: { color: colores.azulBrillante, flexShrink: 1, fontWeight: '700', textDecorationLine: 'underline', fontSize: 16 },
  enlaceConIconoTexto: { color: colores.azul, textDecorationLine: 'none' },
  aviso: {
    backgroundColor: colores.azulSuave, paddingHorizontal: 13, paddingVertical: 11, borderRadius: 12,
    borderLeftWidth: 5, borderLeftColor: colores.azulBrillante, flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  avisoError: { backgroundColor: colores.rojoSuave, borderLeftColor: colores.rojo },
  avisoExito: { backgroundColor: '#EAF6EE', borderLeftColor: colores.exito },
  avisoTexto: { flex: 1, color: colores.azul, fontSize: 16, lineHeight: 23 },
  avisoTextoError: { color: colores.error },
  avisoTextoExito: { color: colores.exito, fontWeight: '600' },
  presionado: { opacity: 0.75 },
});
