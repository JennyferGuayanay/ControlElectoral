import { StyleSheet, Text, View } from 'react-native';

import { colores } from '@/modulos/acceso/presentacion/interfaz';
import { EstadoRegistro, Tarjeta, Texto } from '@/modulos/operacion/presentacion/componentes';

import { nombreDignidad } from '@/modulos/actas/dominio/acta';

import { agruparPorContienda, type TotalCandidato } from '../dominio/seguimiento';
import { GraficoVotos } from './grafico-votos';
import { numeroLocal } from './resumen-seguimiento';

const formatoPorcentaje = new Intl.NumberFormat('es-EC', { style: 'percent', maximumFractionDigits: 1 });

export function ResultadosSeguimiento({ totales, cantones }: {
  totales: TotalCandidato[]; cantones: { id: number; nombre: string }[];
}) {
  const grupos = agruparPorContienda(totales);
  if (!grupos.length) return <Texto>No hay candidaturas en esta selección.</Texto>;
  return grupos.map((grupo) => {
    const { dignidad, contienda_id: contienda, canton_id: cantonId } = grupo[0];
    const canton = cantones.find(({ id }) => id === cantonId);
    const votos = grupo.reduce((total, fila) => total + fila.total_votos, 0);
    const titulo = nombreDignidad[dignidad] + (canton ? ` · Cantón ${canton.nombre}` : '');

    return (
      <Tarjeta key={contienda} titulo={titulo} icono="seguimiento">
        <EstadoRegistro texto="Resultados preliminares" tono="alerta" />
        <Texto destacado>{numeroLocal.format(votos)} votos por candidatura registrados</Texto>
        {votos === 0 ? <Texto>Aún no hay votos por candidatura en la selección.</Texto> : <GraficoVotos totales={grupo} />}
        <Text style={estilos.leyenda}>Porcentaje sobre los votos por candidatura de esta contienda.</Text>
        {grupo.map((fila) => (
          <View key={fila.candidato_id} style={[estilos.fila, { borderLeftColor: fila.color }]}>
            <View accessible={false} style={[estilos.color, { backgroundColor: fila.color }]} />
            <View style={estilos.identidad}>
              <Text style={estilos.nombre}>{fila.candidato}</Text>
              <Text style={estilos.organizacion}>{fila.organizacion}</Text>
              {fila.es_simulacion && <Text style={estilos.simulacion}>Candidatura de simulación</Text>}
            </View>
            <View style={estilos.cifras}>
              <Text style={estilos.total}>{votos > 0 ? formatoPorcentaje.format(fila.total_votos / votos) : '—'}</Text>
              <Text style={estilos.votos}>{numeroLocal.format(fila.total_votos)} {fila.total_votos === 1 ? 'voto' : 'votos'}</Text>
            </View>
          </View>
        ))}
        <Text style={estilos.leyenda}>Los votos blancos y nulos se consultan en el acta de cada mesa.</Text>
      </Tarjeta>
    );
  });
}

const estilos = StyleSheet.create({
  fila: {
    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, padding: 8,
    borderWidth: 1, borderLeftWidth: 4, borderColor: colores.linea, borderRadius: 11, backgroundColor: '#F7F9FF',
  },
  color: { width: 15, height: 15, borderRadius: 4, borderWidth: 1, borderColor: '#8D9BAD' },
  identidad: { flexGrow: 1, flexShrink: 1, flexBasis: 120, gap: 2 },
  nombre: { color: colores.azul, fontSize: 16, fontWeight: '900' },
  organizacion: { color: colores.secundario, fontSize: 14, lineHeight: 19 },
  cifras: { alignItems: 'flex-end', backgroundColor: colores.azulSuave, borderRadius: 8, paddingVertical: 4, paddingHorizontal: 7 },
  leyenda: { color: colores.secundario, fontSize: 14, lineHeight: 20 },
  simulacion: { fontSize: 14, color: colores.secundario, fontWeight: '600' },
  total: { color: colores.azul, fontSize: 18, fontWeight: '900', fontVariant: ['tabular-nums'] },
  votos: { color: colores.secundario, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
