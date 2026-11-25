import { Line, vec } from '@shopify/react-native-skia';
import { StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { Bar, CartesianChart } from 'victory-native';

import type { TotalCandidato } from '../dominio/seguimiento';

const animacion = { type: 'timing', duration: 450 } as const;
const rejilla = [0, 0.25, 0.5, 0.75, 1];

export function GraficoVotos({ totales }: { totales: TotalCandidato[] }) {
  const reducir = useReducedMotion();
  const datos = totales.map((fila, indice) => ({ orden: String(indice + 1), votos: fila.total_votos }));
  const maximo = Math.max(1, ...datos.map((fila) => fila.votos));
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants" style={estilos.grafico}>
      <CartesianChart data={datos} xKey="orden" yKeys={['votos']} domain={{ y: [0, maximo] }}
        padding={{ top: 14, bottom: 12, left: 10, right: 10 }} domainPadding={{ left: 22, right: 22 }}>
        {({ points, chartBounds, yScale }) => (
          <>
            {rejilla.map((fraccion) => {
              const y = yScale(maximo * fraccion);
              return <Line key={fraccion} p1={vec(chartBounds.left, y)} p2={vec(chartBounds.right, y)}
                color="#DDE6F0" strokeWidth={1} />;
            })}
            {points.votos.map((punto, indice) => (
              <Bar key={totales[indice].candidato_id} points={[punto]} chartBounds={chartBounds}
                color={totales[indice].color} barCount={totales.length + 1} innerPadding={0.38}
                roundedCorners={{ topLeft: 5, topRight: 5 }} animate={reducir ? undefined : animacion} />
            ))}
          </>
        )}
      </CartesianChart>
    </View>
  );
}

const estilos = StyleSheet.create({ grafico: { height: 184, backgroundColor: '#F5F8FD', borderRadius: 14 } });
