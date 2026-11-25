import { repositorioOperacion } from '@/modulos/operacion/infraestructura/supabase-operacion';
import { PantallaCuentas } from '@/modulos/operacion/presentacion/pantalla-cuentas';

export default function Ruta() {
  return <PantallaCuentas repositorio={repositorioOperacion} alcance="provincial" />;
}
