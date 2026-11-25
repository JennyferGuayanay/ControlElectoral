import { useLocalSearchParams } from 'expo-router';

import { ConsultaActas } from '@/modulos/actas/presentacion/consulta-actas';

export default function ActasRecinto() {
  const { origen } = useLocalSearchParams<{ origen?: string }>();
  if (origen === 'actas') {
    return <ConsultaActas inicio={{ pathname: '/mesas-recinto', params: { seccion: 'actas' } }}
      etiquetaVolver="Volver a la consulta de actas" />;
  }
  return <ConsultaActas inicio="/mesas-recinto" />;
}
