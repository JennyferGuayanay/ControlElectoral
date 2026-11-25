import { useLocalSearchParams, type Href } from 'expo-router';

import { Pantalla, Texto } from '@/modulos/operacion/presentacion/componentes';

import { repositorioActas } from '../infraestructura/supabase-actas';
import { PantallaConsultarActas } from './pantalla-consultar-actas';

export function ConsultaActas({ inicio, etiquetaVolver }: { inicio: Href; etiquetaVolver?: string }) {
  const { mesa } = useLocalSearchParams<{ mesa?: string }>();
  const id = typeof mesa === 'string' && /^[1-9]\d*$/.test(mesa) ? Number(mesa) : 0;

  if (!Number.isSafeInteger(id) || id <= 0) {
    return (
      <Pantalla titulo="Actas de la mesa" inicio={inicio} etiquetaVolver={etiquetaVolver}>
        <Texto>Selecciona una mesa para consultar sus actas.</Texto>
      </Pantalla>
    );
  }
  return <PantallaConsultarActas key={id} inicio={inicio} etiquetaVolver={etiquetaVolver} mesaId={id} repositorio={repositorioActas} />;
}
