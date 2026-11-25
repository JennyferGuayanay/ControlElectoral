import { StyleSheet, Text, View } from 'react-native';

import AnimacionCarga from '@/compartido/presentacion/animacion-carga';
import { Aviso, Boton, colores } from '@/modulos/acceso/presentacion/interfaz';
import { EstadoRegistro } from '@/modulos/operacion/presentacion/componentes';

import type { EntradaCola } from '../aplicacion/sincronizacion';
import type { ActaConfirmada } from '../dominio/acta';
import { mensajesEnvio, puedeReintentar } from '../dominio/sincronizacion';

export const estadosEnvio = {
  pendiente: { etiqueta: 'Pendiente de sincronización', plural: 'Pendientes', icono: 'coordinacion', tono: 'alerta' },
  sincronizando: { etiqueta: 'Sincronizando', plural: 'En sincronización', icono: 'sincronizacion', tono: 'enCurso' },
  enviada: { etiqueta: 'Sincronizada', plural: 'Sincronizadas', icono: 'escudo', tono: 'positivo' },
  error: { etiqueta: 'Error de sincronización', plural: 'Errores', icono: 'error', tono: 'negativo' },
  conflicto: { etiqueta: 'Conflicto de envío', plural: 'Conflictos', icono: 'actas', tono: 'conflicto' },
} as const;

export function estadoEnvio(acta: ActaConfirmada, entrada?: EntradaCola): keyof typeof estadosEnvio {
  return acta.estado === 'pendiente' ? entrada?.estado ?? 'pendiente' : acta.estado;
}

export function EstadoSincronizacion({ acta, entrada, conectado, reintentar }: {
  acta: ActaConfirmada; entrada?: EntradaCola; conectado: boolean; reintentar(): void;
}) {
  const estado = estadoEnvio(acta, entrada);
  const { etiqueta, tono } = estadosEnvio[estado];
  const distintivo = <EstadoRegistro texto={etiqueta} tono={tono} />;

  if (estado === 'enviada') {
    return (
      <>
        {distintivo}
        <Aviso mensaje={{ tipo: 'exito', texto: 'Sincronizado. El acta quedó registrada en Supabase.' }} />
      </>
    );
  }
  if (estado === 'conflicto') {
    return (
      <>
        {distintivo}
        <Text accessibilityLiveRegion="polite" style={estilos.mensajeConflicto}>
          Conflicto. Ya hay otra acta para esta mesa y dignidad. Tu copia permanece bloqueada.
        </Text>
      </>
    );
  }
  if (estado === 'sincronizando') {
    return (
      <View accessibilityLiveRegion="polite" style={estilos.enCurso}>
        <AnimacionCarga />
        {distintivo}
      </View>
    );
  }
  const motivo = entrada?.motivo ?? null;
  const mensaje = estado === 'error'
    ? { tipo: 'error' as const, texto: `Error de sincronización. ${motivo ? mensajesEnvio[motivo] : 'El acta sigue guardada.'}` }
    : { tipo: 'info' as const, texto: 'Pendiente de envío. El acta se sincroniza cuando hay conexión.' };

  return (
    <>
      {distintivo}
      <Aviso mensaje={mensaje} />
      {puedeReintentar(motivo) && (
        <Boton titulo="Reintentar envío" icono="sincronizacion" deshabilitado={!conectado} alPulsar={reintentar} />
      )}
    </>
  );
}

const estilos = StyleSheet.create({
  enCurso: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 7 },
  mensajeConflicto: {
    backgroundColor: '#FFF0DF', borderLeftWidth: 4, borderLeftColor: '#B85722', borderRadius: 10,
    color: colores.texto, padding: 11, fontSize: 16, lineHeight: 22,
  },
});
