import { useNetInfo } from '@react-native-community/netinfo';
import { StyleSheet, Text, View } from 'react-native';

import { IconoElectoral } from '@/compartido/presentacion/graficos-electorales';
import { colores } from '@/compartido/presentacion/tema-electoral';

export default function IndicadorConexion({ cabecera = false }: { cabecera?: boolean }) {
  const { isConnected, isInternetReachable } = useNetInfo();
  const sinConexion = isConnected === false || isInternetReachable === false;
  const conectado = isConnected === true && isInternetReachable === true;
  const texto = sinConexion ? 'Sin conexión a internet' : conectado ? 'Con conexión a internet' : 'Comprobando conexión…';
  const color = sinConexion ? colores.error : conectado ? colores.exito : '#475569';

  if (cabecera) {
    return (
      <View style={[estilos.insignia, { backgroundColor: color }]}>
        <IconoElectoral nombre="wifi" tamano={18} color={colores.blanco} />
        <Text accessibilityLabel={texto} accessibilityLiveRegion="polite" style={estilos.textoInsignia}>
          {sinConexion ? 'Sin conexión' : conectado ? 'Conectado' : 'Comprobando…'}
        </Text>
      </View>
    );
  }

  return (
    <View style={estilos.indicador}>
      <View style={[estilos.punto, { backgroundColor: color }]} accessible={false} />
      <Text accessibilityLiveRegion="polite" style={[estilos.texto, { color }]}>{texto}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  indicador: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    alignSelf: 'center', marginTop: 'auto', paddingHorizontal: 10, paddingVertical: 4,
  },
  punto: { width: 8, height: 8, borderRadius: 4 },
  texto: { fontSize: 14, fontWeight: '700', flexShrink: 1, textAlign: 'center' },
  insignia: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', maxWidth: '100%',
    borderRadius: 20, borderColor: '#E9F1FF', borderWidth: 1.5, gap: 5, paddingVertical: 6, paddingHorizontal: 9,
  },
  textoInsignia: { color: colores.blanco, fontWeight: '800', fontSize: 14, flexShrink: 1, textAlign: 'center' },
});
