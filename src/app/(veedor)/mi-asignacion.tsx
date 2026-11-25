import { useAcceso } from '@/modulos/acceso/presentacion/proveedor-acceso';
import { repositorioOperacion } from '@/modulos/operacion/infraestructura/supabase-operacion';
import { PantallaMiMesa } from '@/modulos/operacion/presentacion/pantalla-mi-mesa';

export default function MiAsignacion() {
  const { estado } = useAcceso();
  if (estado.tipo !== 'habilitado' || estado.perfil.rol_codigo !== 'veedor') return null;
  return <PantallaMiMesa repositorio={repositorioOperacion} veedorId={estado.perfil.usuario_id} />;
}
