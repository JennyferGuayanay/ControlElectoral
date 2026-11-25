import { useLocalSearchParams } from 'expo-router';

import { useAcceso } from '@/modulos/acceso/presentacion/proveedor-acceso';
import { repositorioOperacion } from '@/modulos/operacion/infraestructura/supabase-operacion';
import { repositorioSeguimiento } from '@/modulos/seguimiento/infraestructura/supabase-seguimiento';
import { PantallaSeguimiento } from '@/modulos/seguimiento/presentacion/pantalla-seguimiento';

export default function Seguimiento() {
  const { estado } = useAcceso();
  const { recinto, dignidad } = useLocalSearchParams<{ recinto?: string; dignidad?: string }>();
  const id = typeof recinto === 'string' && /^[1-9]\d*$/.test(recinto) ? Number(recinto) : 0;
  if (estado.tipo !== 'habilitado' || estado.perfil.rol_codigo !== 'provincial') return null;

  return (
    <PantallaSeguimiento key={`${estado.perfil.usuario_id}:${id}:${dignidad}`} autor={estado.perfil.usuario_id} provincia="Toda la provincia"
      recintoInicial={Number.isSafeInteger(id) && id > 0 ? id : null}
      dignidadInicial={dignidad === 'prefectura' ? 'prefectura' : 'alcaldia'}
      repositorio={repositorioSeguimiento} territorio={repositorioOperacion} />
  );
}
