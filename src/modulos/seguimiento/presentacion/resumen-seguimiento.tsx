import { StyleSheet, Text, View } from 'react-native';
import Animated, { LinearTransition, ReduceMotion } from 'react-native-reanimated';

import { colores } from '@/modulos/acceso/presentacion/interfaz';
import { ResumenGestion, Tarjeta, Texto } from '@/modulos/operacion/presentacion/componentes';

import { resumirAvance, type AvanceRecinto } from '../dominio/seguimiento';

const movimiento = LinearTransition.duration(330).reduceMotion(ReduceMotion.System);
export const numeroLocal = new Intl.NumberFormat('es-EC');

export function BarraAvance({ porcentaje }: { porcentaje: number }) {
  const ancho = `${Math.max(0, Math.min(100, porcentaje))}%` as const;
  return (
    <View style={estilos.pista} accessibilityRole="progressbar" accessibilityLabel="Avance del escrutinio por actas"
      accessibilityValue={{ min: 0, max: 100, now: porcentaje }}>
      <Animated.View layout={movimiento} style={[estilos.relleno, porcentaje === 100 && estilos.completa, { width: ancho }]} />
    </View>
  );
}

export function ResumenSeguimiento({ recintos }: { recintos: AvanceRecinto[] }) {
  const datos = resumirAvance(recintos);
  return (
    <Tarjeta titulo="Resumen del escrutinio" icono="seguimiento">
      <ResumenGestion datos={[
        { etiqueta: 'Total de mesas', cantidad: datos.mesas, icono: 'mesa', tono: 'neutro' },
        { etiqueta: 'Actas esperadas', cantidad: datos.esperadas, icono: 'actas', tono: 'alerta' },
        { etiqueta: 'Actas recibidas', cantidad: datos.actas, icono: 'urna', tono: 'positivo' },
        { etiqueta: 'Actas pendientes', cantidad: datos.esperadas - datos.actas, icono: 'coordinacion', tono: 'negativo' },
      ]} />
      <View style={estilos.avance}>
        <View style={estilos.filaAvance}>
          <Text style={estilos.titulo}>Avance del escrutinio</Text>
          <Text style={estilos.porcentaje}>{numeroLocal.format(datos.porcentaje)} %</Text>
        </View>
        <BarraAvance porcentaje={datos.porcentaje} />
        <Texto>{numeroLocal.format(datos.actas)} de {numeroLocal.format(datos.esperadas)} actas esperadas</Texto>
      </View>
      <Texto>Mesas completas: {numeroLocal.format(datos.completas)} · Con una sola acta: {numeroLocal.format(datos.parciales)}</Texto>
    </Tarjeta>
  );
}

const estilos = StyleSheet.create({
  avance: { backgroundColor: '#EAF4FF', borderWidth: 1, borderColor: '#B8CFEE', borderRadius: 13, padding: 11, gap: 8 },
  filaAvance: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 6 },
  titulo: { color: colores.azul, fontWeight: '800', fontSize: 15, flexShrink: 1 },
  porcentaje: { color: colores.azul, fontSize: 23, fontWeight: '900', fontVariant: ['tabular-nums'] },
  pista: { height: 12, borderRadius: 10, backgroundColor: '#CEDDF2', overflow: 'hidden' },
  relleno: { height: '100%', borderRadius: 10, backgroundColor: colores.azulBrillante },
  completa: { backgroundColor: colores.exito },
});
