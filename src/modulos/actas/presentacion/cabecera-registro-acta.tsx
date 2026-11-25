import { StyleSheet, Text, View } from 'react-native';

import { FranjaTricolor, LogotipoElectoral, OndaTricolor, PaisajeElectoral } from '@/compartido/presentacion/graficos-electorales';
import { colores } from '@/compartido/presentacion/tema-electoral';
import IndicadorConexion from '@/modulos/acceso/presentacion/indicador-conexion';

import type { Dignidad, MesaElectoral } from '../dominio/acta';
import { CabeceraActa } from './lectura-acta';

const etapas = ['Resultados', 'Evidencia', 'Revisión'] as const;

export function CabeceraRegistroActa({ mesa, dignidad }: { mesa: MesaElectoral; dignidad: Dignidad }) {
  return (
    <View style={estilos.portada}>
      <View pointerEvents="none" style={estilos.paisaje}><PaisajeElectoral portada /></View>
      <View pointerEvents="none" style={estilos.onda}><OndaTricolor posicion="pie" amplia /></View>
      <View style={estilos.columna}>
        <View style={estilos.barra}>
          <View style={estilos.marca}>
            <LogotipoElectoral />
            <View style={estilos.nombreMarca}>
              <Text style={estilos.marcaTexto}>Control Electoral</Text>
              <FranjaTricolor estrecha />
            </View>
          </View>
          <IndicadorConexion cabecera />
        </View>
        <CabeceraActa mesa={mesa} dignidad={dignidad} registro />
      </View>
    </View>
  );
}

export function EtapasActa({ etapa }: { etapa: number }) {
  return (
    <View style={estilos.etapas}>
      {etapas.map((nombre, indice) => {
        const actual = indice === etapa;
        const previa = indice < etapa;
        return (
          <View key={nombre} style={[estilos.etapa, previa && estilos.etapaPrevia, actual && estilos.etapaActual]}>
            <View aria-hidden style={[estilos.circulo, actual && estilos.circuloActual]}>
              <Text style={estilos.numero}>{previa ? '✓' : indice + 1}</Text>
            </View>
            <Text accessibilityRole={actual ? 'header' : undefined}
              accessibilityHint={actual ? `Etapa actual, ${indice + 1} de ${etapas.length}`
                : previa ? `Etapa anterior, ${indice + 1} de ${etapas.length}` : `Etapa ${indice + 1} de ${etapas.length}`}
              style={[estilos.nombreEtapa, actual && estilos.nombreActual]}>{nombre}</Text>
          </View>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  portada: { backgroundColor: colores.azul },
  paisaje: { position: 'absolute', top: 0, left: 0, right: 0, height: 180 },
  columna: { width: '100%', maxWidth: 620, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, gap: 44 },
  onda: { position: 'absolute', bottom: 0, width: '100%' },
  barra: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  marca: { flexDirection: 'row', alignItems: 'center', flexShrink: 1, gap: 8 },
  nombreMarca: { flexShrink: 1 },
  marcaTexto: { color: colores.blanco, fontWeight: '900', fontSize: 17 },
  etapas: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  etapa: {
    flexGrow: 1, flexBasis: 87, minHeight: 43, borderRadius: 14, borderWidth: 1, borderColor: colores.linea,
    padding: 5, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: '#E8EEF9',
  },
  etapaActual: { backgroundColor: colores.azulBrillante, borderColor: colores.azulBrillante },
  etapaPrevia: { backgroundColor: '#DCEEE5', borderColor: '#9BCFAE' },
  circulo: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#D2DFF3', alignItems: 'center', justifyContent: 'center' },
  circuloActual: { backgroundColor: colores.blanco },
  numero: { color: colores.azul, fontSize: 13, fontWeight: '900' },
  nombreEtapa: { color: colores.azul, fontSize: 14, fontWeight: '800', textAlign: 'center', flexShrink: 1 },
  nombreActual: { color: colores.blanco },
});
