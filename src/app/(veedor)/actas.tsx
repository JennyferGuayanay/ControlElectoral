import { useAcceso } from '@/modulos/acceso/presentacion/proveedor-acceso';
import { servicioActas, sincronizadorActas } from '@/modulos/actas/infraestructura/servicio-actas';
import { PantallaActas } from '@/modulos/actas/presentacion/pantalla-actas';

export default function MisActas() {
  const { estado } = useAcceso();
  if (estado.tipo !== 'habilitado' || estado.perfil.rol_codigo !== 'veedor') return null;

  return <PantallaActas key={estado.perfil.usuario_id} autorId={estado.perfil.usuario_id} servicio={servicioActas}
    sincronizador={sincronizadorActas} />;
}
