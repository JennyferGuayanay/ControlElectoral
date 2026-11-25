import { useIsFocused } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState, Linking, StyleSheet } from 'react-native';
import { Camera, CommonResolutions, useCameraDevice, useCameraPermission, usePhotoOutput } from 'react-native-vision-camera';

import { Aviso, Boton, mensajeDeError, type Mensaje } from '@/modulos/acceso/presentacion/interfaz';
import { reportarFallo } from '@/modulos/monitoreo/infraestructura/sentry';
import { Texto } from '@/modulos/operacion/presentacion/componentes';

import type { UbicacionEvidencia } from '../dominio/acta';
import { borrarTemporal, comprimirFoto, leerUbicacion, pedirUbicacion } from '../infraestructura/evidencia';
import type { CapturaFotoProps } from './captura-foto';
import { EncuadreDocumento, FotoActa, TarjetaUbicacion } from './evidencia-visual';

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
        <Aviso mensaje={{ tipo: 'info', texto: permiso.canRequestPermission
          ? 'Autoriza el uso de la cámara para fotografiar el acta física.'
          : 'El acceso a la cámara está desactivado. Habilítalo en los ajustes del dispositivo.' }} />
        <Aviso mensaje={mensaje} />
        <Boton titulo={permiso.canRequestPermission ? 'Autorizar cámara' : 'Abrir ajustes de cámara'}
          icono="camara"
          alPulsar={() => { void (permiso.canRequestPermission ? permiso.requestPermission() : Linking.openSettings()).catch(errorCaptura); }} />
      </>
    );
  }
  if (!dispositivo) {
    return <Aviso mensaje={{ tipo: 'error', texto: 'No se encontró una cámara posterior disponible en este dispositivo.' }} />;
  }

  return (
    <>
      {foto ? (
        <>
          <FotoActa uri={foto.uri} etiqueta="Vista previa de la fotografía del acta" />
          <Texto>Comprueba que se lean todas las cifras, las listas y los datos de la junta.</Texto>
          <TarjetaUbicacion ubicacion={foto.ubicacion} />
          <Aviso mensaje={mensaje} />
          <Boton titulo="Aceptar fotografía" tituloCarga="Guardando fotografía…" icono="actas"
            cargando={ocupada} alPulsar={() => void guardarFoto()} />
          <Boton titulo="Repetir captura" deshabilitado={ocupada} variante="secundario" icono="camara" alPulsar={() => {
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
          <EncuadreDocumento>
            <Camera device={dispositivo} isActive={activa && enfocada} outputs={[salida]}
              style={StyleSheet.absoluteFill} implementationMode="compatible"
              enableNativeTapToFocusGesture={dispositivo.supportsFocusMetering}
              onPreviewStarted={() => fijarLista(true)} onPreviewStopped={() => fijarLista(false)}
              onError={(error) => { fijarLista(false); reportarFallo('fotografia-acta', error);
                fijarMensaje({ tipo: 'error', texto: 'La cámara se interrumpió. Cierra y abre la captura para reintentar.' }); }} />
          </EncuadreDocumento>
          <Aviso mensaje={mensaje} />
          <Boton titulo="Tomar foto y registrar ubicación" tituloCarga="Capturando evidencia…" cargando={ocupada}
            icono="camara"
            deshabilitado={!lista || !activa || !enfocada} alPulsar={() => void capturar()} />
        </>
      )}
    </>
  );
}
