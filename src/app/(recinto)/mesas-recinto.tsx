import { repositorioOperacion } from '@/modulos/operacion/infraestructura/supabase-operacion';
import { PantallaMesas } from '@/modulos/operacion/presentacion/pantalla-mesas';

export default function Ruta() {
  return <PantallaMesas repositorio={repositorioOperacion} />;
}
