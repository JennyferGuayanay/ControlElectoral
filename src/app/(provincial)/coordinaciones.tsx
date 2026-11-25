import { repositorioOperacion } from '@/modulos/operacion/infraestructura/supabase-operacion';
import { PantallaCoordinaciones } from '@/modulos/operacion/presentacion/pantalla-coordinaciones';

export default function Ruta() {
  return <PantallaCoordinaciones repositorio={repositorioOperacion} />;
}
