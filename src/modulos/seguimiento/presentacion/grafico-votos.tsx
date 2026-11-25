import { StyleSheet, View } from 'react-native';

import type { TotalCandidato } from '../dominio/seguimiento';

export function GraficoVotos({ totales }: { totales: TotalCandidato[] }) {
  const maximo = Math.max(1, ...totales.map(({ total_votos }) => total_votos));
  return (
    <View accessible={false} style={estilos.grafico}>
      {totales.map(({ candidato_id, color, total_votos }) => (
        <View key={candidato_id} style={estilos.base}>
          <View style={{ backgroundColor: color, height: `${100 * total_votos / maximo}%`, borderTopLeftRadius: 6, borderTopRightRadius: 6 }} />
        </View>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  grafico: { height: 184, backgroundColor: '#F5F8FD', borderRadius: 14, padding: 14, flexDirection: 'row',
    justifyContent: 'space-around', alignItems: 'stretch', gap: 12 },
  base: { flex: 1, maxWidth: 42, justifyContent: 'flex-end', borderBottomWidth: 1, borderBottomColor: '#DDE6F0' },
});
