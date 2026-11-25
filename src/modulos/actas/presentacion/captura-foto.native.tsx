import { Image } from 'expo-image';
import { useIsFocused } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState, Linking, StyleSheet, View } from 'react-native';
import { Camera, CommonResolutions, useCameraDevice, useCameraPermission, usePhotoOutput } from 'react-native-vision-camera';

import { Aviso, Boton, colores, mensajeDeError, type Mensaje } from '@/modulos/acceso/presentacion/interfaz';
import { reportarFallo } from '@/modulos/monitoreo/infraestructura/sentry';
import { Texto } from '@/modulos/operacion/presentacion/componentes';

import type { UbicacionEvidencia } from '../dominio/acta';
import { borrarTemporal, comprimirFoto, leerUbicacion, pedirUbicacion } from '../infraestructura/evidencia';
import type { CapturaFotoProps } from './captura-foto';

export function CapturaFoto({ aceptar }: CapturaFotoProps) {
  const permiso = useCameraPermission();
  const dispositivo = useCameraDevice('back');
  const salida = usePhotoOutput({ targetResolution: CommonResolutions.UHD_4_3, containerFormat: 'jpeg', qualityPrioritization: 'quality' });
  const enfocada = useIsFocused();
  const [activa, fijarActiva] = useState(AppState.currentState === 'active');
  const [lista, fijarLista] = useState(false);
  const [ocupada, fijarOcupada] = useState(false);
  const [foto, fijarFoto] = useState<{ uri: string; ubicacion: UbicacionEvidencia }>();
  const [mensaje, fijarMensaje] = useState<Mensaje>();
  const temporal = useRef<string | undefined>(undefined);
  const montada = useRef(true);

  useEffect(() => {
    montada.current = true;
    const observador = AppState.addEventListener('change', (estado) => fijarActiva(estado === 'active'));
    return () => {
      montada.current = false;
      observador.remove();
      if (temporal.current) borrarTemporal(temporal.current);
    };
  }, []);

  function errorCaptura(error: unknown) {
    reportarFallo('fotografia-acta', error);
    fijarMensaje(mensajeDeError(error, 'No pudimos capturar la evidencia. Intenta de nuevo.'));
  }

  async function capturar() {
    fijarOcupada(true);
    fijarMensaje(undefined);
    try {
      await pedirUbicacion();
      if (!montada.current) return;
      const [fotografia, ubicacion] = await Promise.allSettled([
        salida.capturePhotoToFile({ flashMode: 'off', enableShutterSound: true }, {}).then(({ filePath }) => comprimirFoto(filePath)),
        leerUbicacion(),
      ]);
      if (fotografia.status === 'fulfilled' && (ubicacion.status === 'rejected' || !montada.current)) {
        borrarTemporal(fotografia.value);
      }
      if (!montada.current) return;
      if (fotografia.status === 'rejected') {
        throw new Error('No pudimos tomar o comprimir la foto. Mantén el acta inmóvil e inténtalo de nuevo.');
      }
      if (ubicacion.status === 'rejected') throw ubicacion.reason;
      temporal.current = fotografia.value;
      fijarFoto({ uri: fotografia.value, ubicacion: ubicacion.value });
    } catch (error) {
      if (montada.current) errorCaptura(error);
    } finally {
      if (montada.current) fijarOcupada(false);
    }
  }

  async function guardarFoto() {
    if (!foto) return;
    fijarOcupada(true);
    try {
      await aceptar(foto.uri, foto.ubicacion);
      borrarTemporal(foto.uri);
      temporal.current = undefined;
    } catch (error) {
      if (montada.current) errorCaptura(error);
    } finally {
      if (montada.current) fijarOcupada(false);
    }
  }

  if (!permiso.hasPermission) {
    return (
      <>
        <Texto>La foto del acta se toma desde la cámara del dispositivo.</Texto>
        <Boton titulo={permiso.canRequestPermission ? 'Autorizar cámara' : 'Abrir ajustes de cámara'}
          alPulsar={() => { void (permiso.canRequestPermission ? permiso.requestPermission() : Linking.openSettings()).catch(errorCaptura); }} />
        <Aviso mensaje={mensaje} />
      </>
    );
  }
  if (!dispositivo) return <Texto>No se encontró una cámara posterior disponible.</Texto>;

  return (
    <>
      {foto ? (
        <>
          <Image source={{ uri: foto.uri }} style={estilos.preview} contentFit="contain" cachePolicy="none"
            accessibilityLabel="Vista previa de la fotografía del acta" />
          <Texto>Comprueba que se lean todas las cifras, las listas y los datos de la junta.</Texto>
          <Texto>Precisión de ubicación: {foto.ubicacion.precision_metros.toFixed(1)} m</Texto>
          {foto.ubicacion.ubicacion_simulada && <Aviso mensaje={{ tipo: 'info', texto: 'Android detectó una ubicación simulada. El indicador quedará en el registro.' }} />}
          <Boton titulo="Aceptar fotografía" cargando={ocupada} alPulsar={() => void guardarFoto()} />
          <Boton titulo="Repetir captura" deshabilitado={ocupada} variante="secundario" alPulsar={() => {
            borrarTemporal(foto.uri);
            temporal.current = undefined;
            fijarLista(false);
            fijarFoto(undefined);
            fijarMensaje(undefined);
          }} />
        </>
      ) : (
        <>
          <Texto>Coloca el acta plana y encuadra la hoja completa. {dispositivo.supportsFocusMetering ? 'Toca las cifras en la imagen para enfocar.' : 'Acerca el teléfono hasta que las cifras se vean nítidas.'}</Texto>
          <View style={estilos.preview}>
            <Camera device={dispositivo} isActive={activa && enfocada} outputs={[salida]}
              style={StyleSheet.absoluteFill} enableNativeTapToFocusGesture={dispositivo.supportsFocusMetering}
              onPreviewStarted={() => fijarLista(true)} onPreviewStopped={() => fijarLista(false)}
              onError={(error) => { fijarLista(false); reportarFallo('fotografia-acta', error);
                fijarMensaje({ tipo: 'error', texto: 'La cámara se interrumpió. Cierra y abre la captura para reintentar.' }); }} />
            <View pointerEvents="none" style={estilos.guia} />
          </View>
          <Boton titulo="Tomar foto y registrar ubicación" tituloCarga="Capturando evidencia…" cargando={ocupada}
            deshabilitado={!lista || !activa || !enfocada} alPulsar={() => void capturar()} />
        </>
      )}
      <Aviso mensaje={mensaje} />
    </>
  );
}

const estilos = StyleSheet.create({
  preview: { width: '100%', aspectRatio: 0.84, borderRadius: 14, overflow: 'hidden', backgroundColor: '#14243A' },
  guia: { position: 'absolute', left: '8%', right: '8%', top: '8%', bottom: '8%', borderWidth: 2,
    borderColor: colores.amarillo, borderRadius: 9 },
});
