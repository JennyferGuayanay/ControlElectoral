import { Image } from 'expo-image';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';

import { colores } from './tema-electoral';

const imagenes = {
  escudo: require('../../../assets/images/escudo-ecuador.jpg'),
  fondo: require('../../../assets/images/fondo-electoral.jpg'),
  logo: require('../../../assets/images/logo-electoral.jpg'),
  ondas: require('../../../assets/images/ondas-ecuador.jpg'),
  paisaje: require('../../../assets/images/paisaje-cotacachi.jpg'),
  urna: require('../../../assets/images/urna-electoral.jpg'),
};

const iconos = {
  urna: require('../../../assets/electoral/icono-urna.png'),
  correo: require('../../../assets/electoral/icono-correo.png'),
  clave: require('../../../assets/electoral/icono-clave.png'),
  flecha: require('../../../assets/electoral/icono-flecha.png'),
  atras: require('../../../assets/electoral/icono-atras.png'),
  territorio: require('../../../assets/electoral/icono-territorio.png'),
  seguimiento: require('../../../assets/electoral/icono-seguimiento.png'),
  cuentas: require('../../../assets/electoral/icono-cuentas.png'),
  coordinacion: require('../../../assets/electoral/icono-coordinacion.png'),
  mesa: require('../../../assets/electoral/icono-mesa.png'),
  info: require('../../../assets/electoral/icono-info.png'),
  error: require('../../../assets/electoral/icono-error.png'),
  persona: require('../../../assets/electoral/icono-persona.png'),
  ojo: require('../../../assets/electoral/icono-ojo.png'),
  ocultar: require('../../../assets/electoral/icono-ojo-cerrado.png'),
  escudo: require('../../../assets/electoral/icono-escudo-seguro.png'),
  llave: require('../../../assets/electoral/icono-llave.png'),
  ingreso: require('../../../assets/electoral/icono-ingreso.png'),
  codigo: require('../../../assets/electoral/icono-codigo.png'),
  wifi: require('../../../assets/electoral/icono-wifi.png'),
  ubicacion: require('../../../assets/electoral/icono-ubicacion.png'),
  siguiente: require('../../../assets/electoral/icono-siguiente.png'),
  sincronizacion: require('../../../assets/electoral/icono-sincronizacion.png'),
  actas: require('../../../assets/electoral/icono-actas.png'),
  camara: require('../../../assets/electoral/icono-camara.png'),
};

export type NombreIcono = keyof typeof iconos;
export type PortadaAcceso = 'ingreso' | 'compacta';

const entradaPortada = FadeIn.duration(300).reduceMotion(ReduceMotion.System);

export function IconoElectoral({ nombre, tamano = 26, color }: {
  nombre: NombreIcono; tamano?: number; color?: string;
}) {
  return (
    <Image source={iconos[nombre]} contentFit="contain" tintColor={color}
      accessible={false} style={{ width: tamano, height: tamano }} />
  );
}

export function FondoElectoral() {
  return (
    <View pointerEvents="none" importantForAccessibility="no-hide-descendants" style={estilos.fondo}>
      <Image source={imagenes.fondo} contentFit="cover" accessible={false} style={estilos.patron} />
      <Image source={imagenes.fondo} contentFit="cover" accessible={false} style={estilos.patron} />
    </View>
  );
}

export function PaisajeElectoral({ cabecera = false, portada = false }: { cabecera?: boolean; portada?: boolean }) {
  return (
    <View pointerEvents="none" importantForAccessibility="no-hide-descendants"
      style={[estilos.paisaje, (cabecera || portada) && estilos.paisajeCabecera]}>
      <Image source={imagenes.paisaje} contentFit="cover" contentPosition={{ left: '62%', top: '47%' }}
        accessible={false} style={StyleSheet.absoluteFill} />
      {portada ? (
        <Image source={require('../../../assets/electoral/velo-menu.png')} contentFit="fill"
          accessible={false} style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, estilos.velo, cabecera && estilos.veloCabecera]} />
      )}
    </View>
  );
}

export function LogotipoElectoral() {
  return <Image source={imagenes.logo} contentFit="contain" accessible={false} style={estilos.logo} />;
}

export function EscudoElectoral({ tamano }: { tamano: number }) {
  return (
    <Image source={imagenes.escudo} contentFit="contain" accessibilityLabel="Escudo del Ecuador" accessible
      style={[estilos.escudoMarca, { width: tamano, height: tamano, borderRadius: tamano / 2 }]} />
  );
}

export function OndaTricolor({ posicion, amplia }: { posicion: 'encabezado' | 'pie'; amplia?: boolean }) {
  const pie = posicion === 'pie';

  return (
    <View pointerEvents="none" importantForAccessibility="no-hide-descendants"
      style={[estilos.onda, amplia && (pie ? estilos.ondaPieAcceso : estilos.ondaAcceso)]}>
      {amplia && pie ? (
        <Image source={require('../../../assets/electoral/onda-pie-acceso.png')} accessible={false}
          contentFit="fill" style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[estilos.recorteOnda, pie && estilos.ondaInvertida]}>
          <Image source={imagenes.ondas} accessible={false} contentFit="fill"
            style={[estilos.imagenOnda, amplia && estilos.ondaEsquina]} />
        </View>
      )}
    </View>
  );
}

export function CabeceraElectoral({ portada }: { portada?: PortadaAcceso }) {
  const { width } = useWindowDimensions();

  if (portada) {
    return (
      <View>
        <OndaTricolor posicion="encabezado" amplia />
        <Animated.View entering={entradaPortada} style={[estilos.contenido, estilos.portada]}>
          <FondoElectoral />
          <Image source={imagenes.paisaje} contentFit="cover" contentPosition={{ left: '65%', top: '53%' }}
            accessible={false} style={estilos.paisajePortada} />
          <View style={[estilos.escudo, estilos.sobreFondo]}>
            <Image source={imagenes.escudo} contentFit="contain" accessibilityLabel="Escudo del Ecuador"
              accessible style={StyleSheet.absoluteFill} />
          </View>
          <Text accessibilityRole="header" style={[estilos.titulo, width < 360 && estilos.tituloEstrecho]}>
            Control Electoral
          </Text>
          <FranjaTricolor />
          <View style={estilos.insignia}>
            <IconoElectoral nombre="escudo" tamano={31} />
            <Text style={estilos.detalle}>Acceso seguro</Text>
          </View>
          {portada === 'ingreso' ? (
            <View style={[estilos.urna, estilos.sobreFondo]}>
              <Image source={imagenes.urna} contentFit="contain" accessible={false} style={StyleSheet.absoluteFill} />
            </View>
          ) : (
            <View style={[estilos.logoPortada, estilos.sobreFondo]}>
              <Image source={imagenes.logo} contentFit="contain" accessible={false} style={StyleSheet.absoluteFill} />
            </View>
          )}
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={estilos.cabecera}>
      <View style={estilos.franjaMarca}>
        <PaisajeElectoral cabecera />
        <View style={[estilos.contenido, estilos.filaMarca]}>
          <View style={estilos.marca}>
            <LogotipoElectoral />
            <Text style={estilos.marcaNombre}>Control Electoral</Text>
          </View>
          <EscudoElectoral tamano={40} />
        </View>
      </View>
      <OndaTricolor posicion="pie" />
    </View>
  );
}

export function FranjaTricolor({ estrecha }: { estrecha?: boolean }) {
  return (
    <View style={[estilos.franja, estrecha && estilos.franjaEstrecha]} importantForAccessibility="no-hide-descendants">
      <View style={estilos.franjaAmarilla} />
      <View style={estilos.franjaAzul} />
      <View style={estilos.franjaRoja} />
    </View>
  );
}

const estilos = StyleSheet.create({
  fondo: { ...StyleSheet.absoluteFill, backgroundColor: colores.fondo, overflow: 'hidden' },
  patron: { width: '100%', aspectRatio: 2048 / 1365, flexShrink: 0, opacity: 0.13 },
  paisaje: { ...StyleSheet.absoluteFill, borderRadius: 15, overflow: 'hidden' },
  paisajeCabecera: { borderRadius: 0 },
  velo: { backgroundColor: 'rgba(5, 23, 59, 0.78)' },
  veloCabecera: { backgroundColor: 'rgba(5, 23, 59, 0.50)' },
  cabecera: { backgroundColor: colores.fondo },
  franjaMarca: { backgroundColor: colores.azul },
  contenido: { width: '100%', maxWidth: 620, alignSelf: 'center', paddingHorizontal: 20 },
  portada: { alignItems: 'center', marginTop: -1, paddingHorizontal: 12, paddingBottom: 3, gap: 4 },
  paisajePortada: {
    position: 'absolute', width: '50%', height: 120, right: 0, top: 12,
    opacity: 0.065, borderTopLeftRadius: 90, borderBottomLeftRadius: 85,
    borderBottomRightRadius: 30, borderTopRightRadius: 20,
  },
  sobreFondo: { mixBlendMode: 'multiply', overflow: 'hidden' },
  filaMarca: {
    minHeight: 90, paddingVertical: 14, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', gap: 12,
  },
  marca: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 42, height: 42, borderRadius: 10, backgroundColor: colores.blanco },
  escudoMarca: { width: 40, height: 40, borderRadius: 20, backgroundColor: colores.blanco },
  marcaNombre: {
    color: colores.blanco, fontSize: 21, fontWeight: '900', flexShrink: 1,
    textShadowColor: colores.azul, textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 5,
  },
  escudo: { width: 82, height: 82, borderRadius: 41 },
  titulo: {
    color: colores.azul, fontSize: 40, fontWeight: '900', fontStyle: 'italic',
    letterSpacing: -1.25, textAlign: 'center', maxWidth: '100%',
  },
  tituloEstrecho: { fontSize: 34 },
  franja: { flexDirection: 'row', width: '61%', maxWidth: 260, height: 7, marginVertical: 3 },
  franjaEstrecha: { width: '100%', maxWidth: 140, height: 4, marginTop: 5, marginBottom: 0 },
  franjaAmarilla: { flex: 2, backgroundColor: colores.amarillo, borderTopLeftRadius: 8, transform: [{ skewX: '-25deg' }] },
  franjaAzul: { flex: 1.65, backgroundColor: colores.azulBrillante, transform: [{ skewX: '-25deg' }] },
  franjaRoja: { flex: 1.45, backgroundColor: colores.rojo, borderBottomRightRadius: 8, transform: [{ skewX: '-25deg' }] },
  insignia: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, maxWidth: '100%' },
  detalle: { color: colores.azul, fontSize: 22, fontWeight: '800', textAlign: 'center', flexShrink: 1 },
  urna: { width: '60%', maxWidth: 234, aspectRatio: 1, borderRadius: 26, marginTop: 1, marginBottom: -18 },
  logoPortada: { width: 43, height: 43, borderRadius: 8, marginTop: 4, marginBottom: 1 },
  onda: { width: '100%', height: 42 },
  ondaAcceso: { height: 51 },
  ondaPieAcceso: { height: 63 },
  recorteOnda: { flex: 1, overflow: 'hidden' },
  // La franja tricolor ocupa aproximadamente el tercio superior del JPG.
  imagenOnda: { position: 'absolute', top: 0, width: '100%', height: '345%' },
  ondaEsquina: { width: '147%' },
  ondaInvertida: { transform: [{ rotate: '180deg' }] },
});
