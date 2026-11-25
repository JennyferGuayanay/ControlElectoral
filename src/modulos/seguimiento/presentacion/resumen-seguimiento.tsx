import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition, ReduceMotion } from 'react-native-reanimated';

import { colores } from '@/modulos/acceso/presentacion/interfaz';
import { Texto } from '@/modulos/operacion/presentacion/componentes';

import { resumirAvance, type AvanceRecinto } from '../dominio/seguimiento';

const entrada = FadeInDown.duration(240).reduceMotion(ReduceMotion.System);
const movimiento = LinearTransition.duration(330).reduceMotion(ReduceMotion.System);
export const numeroLocal = new Intl.NumberFormat('es-EC');

export function BarraAvance({ porcentaje }: { porcentaje: number }) {
  const ancho = `${Math.max(0, Math.min(100, porcentaje))}%` as const;
  return (
    <View style={estilos.pista} accessibilityRole="progressbar" accessibilityLabel="Avance del escrutinio por actas"
      accessibilityValue={{ min: 0, max: 100, now: porcentaje }}>
      <Animated.View layout={movimiento} style={[estilos.relleno, { width: ancho }]} />
    </View>
  );
}

export function ResumenSeguimiento({ recintos, ambito }: { recintos: AvanceRecinto[]; ambito: string }) {
  const datos = resumirAvance(recintos);
  const indicadores = [
    { valor: datos.recintos, titulo: 'Recintos', subtitulo: 'En la selección' },
    { valor: datos.reportadas, titulo: 'Mesas reportadas', subtitulo: 'Con al menos un acta' },
    { valor: datos.pendientes, titulo: 'Mesas pendientes', subtitulo: 'Aún sin actas' },
    { valor: datos.completas, titulo: 'Mesas completas', subtitulo: 'Con las dos actas' },
  ];
  return (
    <>
      <Animated.View entering={entrada} style={estilos.principal}>
        <Text style={estilos.ambito}>{ambito}</Text>
        <Text style={estilos.porcentaje}>{numeroLocal.format(datos.porcentaje)}%</Text>
        <Text style={estilos.claro}>
          {numeroLocal.format(datos.actas)} de {numeroLocal.format(datos.esperadas)} actas esperadas
        </Text>
        <BarraAvance porcentaje={datos.porcentaje} />
      </Animated.View>
      <View style={estilos.cuadricula}>
        {indicadores.map(({ valor, titulo, subtitulo }) => (
          <View key={titulo} style={estilos.indicador}>
            <Text style={estilos.cifra}>{numeroLocal.format(valor)}</Text>
            <Texto destacado>{titulo}</Texto>
            <Texto>{subtitulo}</Texto>
          </View>
        ))}
      </View>
      <Texto>Mesas con una sola acta: {numeroLocal.format(datos.parciales)} de {numeroLocal.format(datos.mesas)} mesas.</Texto>
    </>
  );
}

const estilos = StyleSheet.create({
  principal: { backgroundColor: colores.azul, borderRadius: 20, borderLeftColor: colores.amarillo,
    borderLeftWidth: 6, padding: 19, gap: 7 },
  ambito: { color: '#FDE28C', fontSize: 17, fontWeight: '700' },
  porcentaje: { color: colores.blanco, fontSize: 45, fontWeight: '800', fontVariant: ['tabular-nums'] },
  claro: { color: '#E9F2FF', fontSize: 16, marginBottom: 6 },
  pista: { height: 9, borderRadius: 8, backgroundColor: '#D9E4F1', overflow: 'hidden' },
  relleno: { height: 9, borderRadius: 8, backgroundColor: colores.amarillo },
  cuadricula: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  indicador: { flexBasis: '46%', flexGrow: 1, gap: 3, backgroundColor: colores.blanco, borderRadius: 14,
    borderColor: colores.linea, borderWidth: 1, padding: 13 },
  cifra: { color: colores.azul, fontSize: 29, fontWeight: '800', fontVariant: ['tabular-nums'] },
});
