import { ActivityIndicator, View } from 'react-native';

import { Aviso, Boton, colores } from '@/modulos/acceso/presentacion/interfaz';
import { Texto } from '@/modulos/operacion/presentacion/componentes';

import type { EntradaCola } from '../aplicacion/sincronizacion';
import type { ActaConfirmada } from '../dominio/acta';
import { mensajesEnvio, puedeReintentar } from '../dominio/sincronizacion';

export function EstadoSincronizacion({ acta, entrada, conectado, reintentar }: {
  acta: ActaConfirmada; entrada?: EntradaCola; conectado: boolean; reintentar(): void;
}) {
  if (acta.estado === 'enviada') {
    return <Aviso mensaje={{ tipo: 'exito', texto: 'Sincronizado. El acta quedó registrada en Supabase.' }} />;
  }
  if (acta.estado === 'conflicto') {
    return <Aviso mensaje={{ tipo: 'error', texto: 'Conflicto. Ya hay otra acta para esta mesa y dignidad. Tu copia permanece bloqueada.' }} />;
  }
  if (entrada?.estado === 'sincronizando') {
    return (
      <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
        <ActivityIndicator color={colores.azul} />
        <Texto destacado>Sincronizando</Texto>
      </View>
    );
  }
  const motivo = entrada?.motivo ?? null;
  const mensaje = entrada?.estado === 'error' && motivo
    ? { tipo: 'error' as const, texto: `Error de sincronización. ${mensajesEnvio[motivo]}` }
    : { tipo: 'info' as const, texto: 'Pendiente de envío. El acta se sincroniza cuando hay conexión.' };

  return (
    <>
      <Aviso mensaje={mensaje} />
      {puedeReintentar(motivo) && (
        <Boton titulo="Reintentar envío" variante="secundario" deshabilitado={!conectado} alPulsar={reintentar} />
      )}
    </>
  );
}
