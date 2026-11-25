import { repositorioOperacion } from '@/modulos/operacion/infraestructura/supabase-operacion';
import { PantallaTerritorio } from '@/modulos/operacion/presentacion/pantalla-territorio';

export default function Ruta() {
  return <PantallaTerritorio repositorio={repositorioOperacion} />;
}
