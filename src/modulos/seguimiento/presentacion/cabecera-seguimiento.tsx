import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';

import { EscudoElectoral, IconoElectoral, LogotipoElectoral, OndaTricolor, PaisajeElectoral } from '@/compartido/presentacion/graficos-electorales';
import { colores, sombraTarjeta } from '@/compartido/presentacion/tema-electoral';
import IndicadorConexion from '@/modulos/acceso/presentacion/indicador-conexion';

const entrada = FadeInDown.duration(240).reduceMotion(ReduceMotion.System);

export function CabeceraSeguimiento({ ambito, detalle }: { ambito: string; detalle?: string }) {
  return (
    <View style={estilos.portada}>
      <View style={estilos.marca}>
        <View style={[estilos.columna, estilos.filaSuperior]}>
          <View style={estilos.identidad}>
            <LogotipoElectoral />
            <Text style={estilos.nombre}>Control Electoral</Text>
          </View>
          <IndicadorConexion cabecera />
        </View>
      </View>
      <View style={estilos.paisaje}>
        <PaisajeElectoral cabecera />
        <View pointerEvents="none" style={estilos.onda}><OndaTricolor posicion="pie" amplia /></View>
        <Animated.View entering={entrada} style={[estilos.columna, estilos.resumen]}>
          <Text accessibilityRole="header" style={estilos.titulo}>Seguimiento electoral</Text>
          <View style={estilos.ambito}>
            <EscudoElectoral tamano={44} />
            <View style={estilos.textos}>
              <View style={estilos.ubicacion}>
                <IconoElectoral nombre="ubicacion" tamano={18} color={colores.azul} />
                <Text style={estilos.ambitoTitulo}>{ambito}</Text>
              </View>
              {detalle && <Text style={estilos.ambitoDetalle}>{detalle}</Text>}
            </View>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  portada: { backgroundColor: colores.azul },
  columna: { width: '100%', maxWidth: 620, alignSelf: 'center', paddingHorizontal: 16 },
  marca: { backgroundColor: '#FFDB37', borderBottomWidth: 3, borderColor: '#F3B916' },
  filaSuperior: {
    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center',
    justifyContent: 'space-between', gap: 8, paddingVertical: 11,
  },
  identidad: { flexDirection: 'row', alignItems: 'center', flexShrink: 1, gap: 8 },
  nombre: { color: colores.azul, fontSize: 18, fontWeight: '900', flexShrink: 1 },
  paisaje: { minHeight: 168, backgroundColor: colores.azul },
  resumen: { paddingTop: 31, paddingBottom: 19, gap: 9 },
  titulo: {
    color: colores.blanco, fontSize: 29, fontWeight: '900',
    textShadowColor: colores.azul, textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6,
  },
  onda: { position: 'absolute', bottom: 0, width: '100%' },
  ambito: {
    ...sombraTarjeta, backgroundColor: '#F7FAFF', borderRadius: 17, borderWidth: 1, borderColor: '#ADC5F0',
    padding: 8, gap: 8, flexDirection: 'row', alignItems: 'center',
  },
  textos: { flex: 1, gap: 2 },
  ubicacion: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ambitoTitulo: { color: colores.azul, fontWeight: '900', fontSize: 16, flexShrink: 1 },
  ambitoDetalle: { color: colores.secundario, fontSize: 14, lineHeight: 19 },
});
