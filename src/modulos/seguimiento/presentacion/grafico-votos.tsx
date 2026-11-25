import { StyleSheet, View } from 'react-native';
import Animated, { LinearTransition, ReduceMotion } from 'react-native-reanimated';

import type { TotalCandidato } from '../dominio/seguimiento';

const entrada = LinearTransition.duration(330).reduceMotion(ReduceMotion.System);
const rejilla = ['0%', '25%', '50%', '75%', '100%'] as const;

export function GraficoVotos({ totales }: { totales: TotalCandidato[] }) {
  const maximo = Math.max(1, ...totales.map(({ total_votos }) => total_votos));
  return (
    <View accessible={false} style={estilos.grafico}>
      <View style={estilos.area}>
        {rejilla.map((nivel) => <View key={nivel} style={[estilos.linea, { top: nivel }]} />)}
        {totales.map(({ candidato_id, color, total_votos }) => (
          <View key={candidato_id} style={estilos.base}>
            <Animated.View layout={entrada}
              style={[estilos.barra, { backgroundColor: color, height: `${100 * total_votos / maximo}%` }]} />
          </View>
        ))}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  grafico: { height: 184, backgroundColor: '#F0F5FE', borderRadius: 14, borderWidth: 1, borderColor: '#CCDAEF', padding: 12 },
  area: { flex: 1, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'stretch', gap: 8 },
  linea: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: '#C9D8ED' },
  base: { flex: 1, maxWidth: 38, justifyContent: 'flex-end' },
  barra: { borderTopLeftRadius: 5, borderTopRightRadius: 5 },
});
