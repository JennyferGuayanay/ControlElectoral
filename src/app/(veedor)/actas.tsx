import { useLocalSearchParams } from 'expo-router';

import { useAcceso } from '@/modulos/acceso/presentacion/proveedor-acceso';
import { esquemaDignidad } from '@/modulos/actas/dominio/acta';
import { servicioActas, sincronizadorActas } from '@/modulos/actas/infraestructura/servicio-actas';
import { PantallaActas } from '@/modulos/actas/presentacion/pantalla-actas';

export default function MisActas() {
  const { estado } = useAcceso();
  const parametros = useLocalSearchParams<{ dignidad?: string; seccion?: string }>();
  if (estado.tipo !== 'habilitado' || estado.perfil.rol_codigo !== 'veedor') return null;

  const dignidad = esquemaDignidad.safeParse(parametros.dignidad).data;
  const soloSincronizacion = parametros.seccion === 'sincronizacion';
  const autorId = estado.perfil.usuario_id;
  return <PantallaActas key={autorId + ':' + (soloSincronizacion ? 'sincronizacion' : dignidad ?? 'todas')}
    autorId={autorId} servicio={servicioActas} sincronizador={sincronizadorActas}
    dignidad={dignidad} soloSincronizacion={soloSincronizacion} />;
}
