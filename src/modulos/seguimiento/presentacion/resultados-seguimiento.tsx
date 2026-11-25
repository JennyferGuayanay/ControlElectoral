import { StyleSheet, Text, View } from 'react-native';

import { colores } from '@/modulos/acceso/presentacion/interfaz';
import { Tarjeta, Texto } from '@/modulos/operacion/presentacion/componentes';

import { nombreDignidad } from '@/modulos/actas/dominio/acta';

import { agruparPorContienda, type TotalCandidato } from '../dominio/seguimiento';
import { GraficoVotos } from './grafico-votos';
import { numeroLocal } from './resumen-seguimiento';

export function ResultadosSeguimiento({ totales, cantones }: {
  totales: TotalCandidato[]; cantones: { id: number; nombre: string }[];
}) {
  const grupos = agruparPorContienda(totales);
  if (!grupos.length) return <Texto>No hay candidaturas en esta selección.</Texto>;
  return grupos.map((grupo) => {
    const { dignidad, contienda_id: contienda, canton_id: cantonId } = grupo[0];
    const canton = cantones.find(({ id }) => id === cantonId);
    const votos = grupo.reduce((total, fila) => total + fila.total_votos, 0);
    const titulo = nombreDignidad[dignidad] + (canton ? ` · ${canton.nombre}` : '');

    return (
      <Tarjeta key={contienda} titulo={titulo}>
        <Texto destacado>{numeroLocal.format(votos)} votos por candidatura registrados</Texto>
        {votos === 0 ? <Texto>Aún no hay votos por candidatura en la selección.</Texto> : <GraficoVotos totales={grupo} />}
        {grupo.map((fila) => (
          <View key={fila.candidato_id} style={estilos.fila}>
            <View accessible={false} style={[estilos.color, { backgroundColor: fila.color }]} />
            <View style={estilos.identidad}>
              <Texto destacado>{fila.candidato}</Texto>
              <Texto>{fila.organizacion}</Texto>
              {fila.es_simulacion && <Text style={estilos.simulacion}>Candidatura de simulación</Text>}
            </View>
            <Text accessibilityLabel={`${numeroLocal.format(fila.total_votos)} votos`} style={estilos.total}>
              {numeroLocal.format(fila.total_votos)}
            </Text>
          </View>
        ))}
      </Tarjeta>
    );
  });
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', gap: 10, paddingVertical: 9, alignItems: 'flex-start',
    borderBottomWidth: 1, borderBottomColor: colores.linea },
  color: { width: 15, height: 15, borderRadius: 4, marginTop: 6, borderWidth: 1, borderColor: '#8D9BAD' },
  identidad: { flex: 1 },
  simulacion: { fontSize: 14, color: colores.secundario, fontWeight: '600' },
  total: { color: colores.azul, fontSize: 20, fontWeight: '800', fontVariant: ['tabular-nums'] },
});
