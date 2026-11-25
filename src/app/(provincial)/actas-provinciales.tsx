import { useLocalSearchParams } from 'expo-router';

import { ConsultaActas } from '@/modulos/actas/presentacion/consulta-actas';

export default function ActasProvinciales() {
  const { origen, recinto, dignidad } = useLocalSearchParams<{ origen?: string; recinto?: string; dignidad?: string }>();
  if (origen === 'seguimiento' && typeof recinto === 'string' && /^[1-9]\d*$/.test(recinto)) {
    return <ConsultaActas inicio={{ pathname: '/seguimiento', params: { recinto, dignidad } }}
      etiquetaVolver="Volver al seguimiento del recinto" />;
  }
  return <ConsultaActas inicio="/territorio" />;
}
