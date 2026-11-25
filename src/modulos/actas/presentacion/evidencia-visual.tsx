import { Image } from 'expo-image';
import { useState, type PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { IconoElectoral } from '@/compartido/presentacion/graficos-electorales';
import { Aviso, colores } from '@/modulos/acceso/presentacion/interfaz';
import { EstadoRegistro, fechaLocal, Tarjeta, Texto } from '@/modulos/operacion/presentacion/componentes';

import type { UbicacionEvidencia } from '../dominio/acta';

const esquinas = ['superiorIzquierda', 'superiorDerecha', 'inferiorIzquierda', 'inferiorDerecha'] as const;

export function EncuadreDocumento({ children }: PropsWithChildren) {
  return (
    <View style={[estilos.encuadre, !children && estilos.guiaAntes]}>
      {children ?? (
        <View style={estilos.documento} aria-hidden>
          <IconoElectoral nombre="actas" tamano={47} color="#A4BEE9" />
        </View>
      )}
      <View pointerEvents="none" aria-hidden style={estilos.guia}>
        {esquinas.map((esquina) => <View key={esquina} style={[estilos.esquina, estilos[esquina]]} />)}
      </View>
    </View>
  );
}

export function FotoActa({ uri, etiqueta = 'Fotografía de respaldo del acta' }: { uri: string; etiqueta?: string }) {
  const [fallo, fijarFallo] = useState<string>();
  if (!uri) {
    return <Aviso mensaje={{ tipo: 'info', texto: 'La fotografía local se puede consultar en la aplicación móvil.' }} />;
  }
  if (fallo === uri) {
    return <Aviso mensaje={{ tipo: 'error', texto: 'No se pudo mostrar la fotografía de respaldo.' }} />;
  }
  return (
    <Image source={{ uri }} style={estilos.foto} contentFit="contain" cachePolicy="none"
      accessibilityLabel={etiqueta} onError={() => fijarFallo(uri)} />
  );
}

export function DatosUbicacion({ ubicacion }: { ubicacion: UbicacionEvidencia }) {
  const valores = [
    { etiqueta: 'Latitud', valor: ubicacion.latitud.toFixed(6) },
    { etiqueta: 'Longitud', valor: ubicacion.longitud.toFixed(6) },
    { etiqueta: 'Precisión', valor: `${ubicacion.precision_metros.toFixed(1)} m` },
  ];
  return (
    <>
      <EstadoRegistro texto="Ubicación obtenida" tono={ubicacion.ubicacion_simulada ? 'alerta' : 'positivo'} />
      {ubicacion.ubicacion_simulada
        ? <Aviso mensaje={{ tipo: 'info', texto: 'Ubicación simulada detectada. El indicador queda en el registro.' }} />
        : <Texto>El dispositivo no reportó ubicación simulada.</Texto>}
      <View style={estilos.datos}>
        {valores.map(({ etiqueta, valor }) => (
          <View key={etiqueta} style={estilos.dato}>
            <Text style={estilos.etiqueta}>{etiqueta}</Text>
            <Text style={estilos.valor}>{valor}</Text>
          </View>
        ))}
      </View>
      <Text style={estilos.hora}>Captura: {fechaLocal(ubicacion.capturada_en)}</Text>
    </>
  );
}

export function TarjetaUbicacion({ ubicacion }: { ubicacion?: UbicacionEvidencia }) {
  return (
    <Tarjeta titulo="Ubicación geográfica" icono="ubicacion">
      {ubicacion ? <DatosUbicacion ubicacion={ubicacion} /> : (
        <>
          <EstadoRegistro texto="Ubicación pendiente" tono="alerta" />
          <Texto>La ubicación se registra al tomar la fotografía. Mantén activada la ubicación del dispositivo.</Texto>
        </>
      )}
    </Tarjeta>
  );
}

const estilos = StyleSheet.create({
  encuadre: { width: '100%', aspectRatio: 0.84, borderRadius: 15, overflow: 'hidden', backgroundColor: '#101F3C' },
  guiaAntes: { aspectRatio: 1.55, alignItems: 'center', justifyContent: 'center', backgroundColor: colores.azul },
  documento: {
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#243E6C',
    width: 72, height: 87, borderRadius: 9, borderWidth: 1, borderColor: '#6683B3',
  },
  guia: { position: 'absolute', top: '7%', bottom: '7%', left: '9%', right: '9%' },
  esquina: { position: 'absolute', width: 28, height: 28, borderColor: colores.amarillo },
  superiorIzquierda: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 7 },
  superiorDerecha: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 7 },
  inferiorIzquierda: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 7 },
  inferiorDerecha: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 7 },
  foto: { width: '100%', aspectRatio: 0.82, borderRadius: 12, backgroundColor: '#182B4A' },
  datos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dato: { flexGrow: 1, flexBasis: 128, padding: 9, borderRadius: 11, backgroundColor: '#EAF2FF', borderWidth: 1, borderColor: colores.linea },
  etiqueta: { color: colores.secundario, fontSize: 14, fontWeight: '700' },
  valor: { color: colores.azul, fontSize: 18, fontWeight: '900', fontVariant: ['tabular-nums'], marginTop: 2 },
  hora: { color: colores.secundario, fontSize: 15, lineHeight: 21 },
});
