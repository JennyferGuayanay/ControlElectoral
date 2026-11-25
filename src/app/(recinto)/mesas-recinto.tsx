import { useLocalSearchParams } from 'expo-router';

import { repositorioOperacion } from '@/modulos/operacion/infraestructura/supabase-operacion';
import { PantallaMesas } from '@/modulos/operacion/presentacion/pantalla-mesas';

export default function Ruta() {
  const { seccion } = useLocalSearchParams<{ seccion?: string }>();
  const vista = seccion === 'actas' || seccion === 'reemplazos' ? seccion : 'asignaciones';
  return <PantallaMesas key={vista} repositorio={repositorioOperacion} vista={vista} />;
}
