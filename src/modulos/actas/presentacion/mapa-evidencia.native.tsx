import { Camera, Map, ViewAnnotation } from '@maplibre/maplibre-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { colores } from '@/modulos/acceso/presentacion/interfaz';
import { Texto } from '@/modulos/operacion/presentacion/componentes';

import type { UbicacionEvidencia } from '../dominio/acta';

export function MapaEvidencia({ ubicacion }: { ubicacion: UbicacionEvidencia }) {
  const [fallo, fijarFallo] = useState(false);
  const punto: [number, number] = [ubicacion.longitud, ubicacion.latitud];
  if (fallo) return <Texto>Las teselas no están disponibles. Puedes consultar las coordenadas de la evidencia.</Texto>;

  return (
    <Map style={estilos.mapa} androidView="texture" mapStyle="https://tiles.openfreemap.org/styles/liberty"
      onDidFailLoadingMap={() => fijarFallo(true)}>
      <Camera initialViewState={{ center: punto, zoom: 16 }} />
      <ViewAnnotation id="lugar-captura" lngLat={punto}>
        <View style={estilos.punto} />
      </ViewAnnotation>
    </Map>
  );
}

const estilos = StyleSheet.create({
  mapa: { height: 260, width: '100%' },
  punto: { height: 22, width: 22, borderRadius: 11, backgroundColor: colores.rojo,
    borderWidth: 3, borderColor: colores.blanco },
});
