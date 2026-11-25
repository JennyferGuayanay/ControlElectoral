import { useState } from 'react';

import { Aviso, Boton, Encabezado, Marco, mensajeDeError, type Mensaje } from '@/modulos/acceso/presentacion/interfaz';
import { Tarjeta, Texto } from '@/modulos/operacion/presentacion/componentes';

import type { ServicioActas } from '../aplicacion/actas';
import { prepararEnvio, type ActaConfirmada, type Borrador, type Candidato, type MesaElectoral, type UbicacionEvidencia, type ValoresActa } from '../dominio/acta';
import { CapturaFoto } from './captura-foto';
import { FormularioActa } from './formulario-acta';
import { CabeceraActa, DatosUbicacion, FotoActa, ResultadosActa } from './lectura-acta';

const etapas = ['Resultados', 'Evidencia', 'Revisión'] as const;

export function EditorActa({ servicio, mesa, candidatos, inicial, salir, confirmar }: {
  servicio: ServicioActas; mesa: MesaElectoral; candidatos: Candidato[]; inicial: Borrador;
  salir(): void; confirmar(acta: ActaConfirmada): void;
}) {
  const [borrador, fijarBorrador] = useState(inicial);
  const [etapa, fijarEtapa] = useState(0);
  const [captura, fijarCaptura] = useState(false);
  const [ocupado, fijarOcupado] = useState(false);
  const [mensaje, fijarMensaje] = useState<Mensaje>();

  function avanzar(paso: number) {
    fijarMensaje(undefined);
    fijarEtapa(paso);
  }

  async function guardar(valores: ValoresActa, continuar: boolean) {
    if (ocupado) return;
    fijarOcupado(true);
    fijarMensaje(undefined);
    try {
      const siguiente = { ...borrador, valores };
      await servicio.local.actualizar(siguiente);
      fijarBorrador(siguiente);
      if (continuar) avanzar(1);
      else salir();
    } catch (error) {
      fijarMensaje(mensajeDeError(error, 'No pudimos guardar el borrador.'));
    } finally {
      fijarOcupado(false);
    }
  }

  async function aceptar(uri: string, ubicacion: UbicacionEvidencia) {
    fijarBorrador(await servicio.aceptarFoto(borrador, uri, ubicacion));
    fijarCaptura(false);
    fijarMensaje({ tipo: 'exito', texto: 'Evidencia guardada en el dispositivo.' });
  }

  async function confirmarActa() {
    if (ocupado) return;
    fijarOcupado(true);
    fijarMensaje(undefined);
    try {
      confirmar(await servicio.confirmar(borrador, candidatos));
    } catch (error) {
      fijarMensaje(mensajeDeError(error, 'No pudimos confirmar el acta.'));
    } finally {
      fijarOcupado(false);
    }
  }

  const foto = borrador.foto;

  return (
    <Marco key={etapa}>
      <Encabezado titulo={etapas[etapa]} detalle={`Paso ${etapa + 1} de ${etapas.length}`} />
      <CabeceraActa mesa={mesa} dignidad={borrador.dignidad} />
      {etapa === 0 && <FormularioActa inicial={borrador.valores} candidatos={candidatos} guardar={guardar} />}
      {etapa === 1 && (
        <>
          <Tarjeta titulo="Fotografía y ubicación">
            {captura ? <CapturaFoto aceptar={aceptar} /> : (
              <>
                {foto ? (
                  <>
                    <FotoActa uri={servicio.archivos.uri(borrador.autorId, foto.archivo)} />
                    <DatosUbicacion ubicacion={foto.ubicacion} />
                  </>
                ) : <Texto>Toma una foto de la hoja completa. Su ubicación se registra al disparar.</Texto>}
                <Boton titulo={foto ? 'Tomar otra fotografía' : 'Abrir cámara'} alPulsar={() => {
                  fijarMensaje(undefined);
                  fijarCaptura(true);
                }} />
              </>
            )}
          </Tarjeta>
          {!captura && <Boton titulo="Continuar a revisión" deshabilitado={!foto} alPulsar={() => avanzar(2)} />}
          {captura ? <Boton titulo="Cerrar cámara" variante="secundario" alPulsar={() => fijarCaptura(false)} />
            : <Boton titulo="Volver a resultados" variante="secundario" alPulsar={() => avanzar(0)} />}
          {!captura && <Boton titulo="Salir a mis actas" variante="secundario" alPulsar={salir} />}
        </>
      )}
      {etapa === 2 && foto && (
        <>
          <ResultadosActa candidatos={candidatos} datos={prepararEnvio(borrador.valores, candidatos)} />
          <Tarjeta titulo="Evidencia aceptada">
            <FotoActa uri={servicio.archivos.uri(borrador.autorId, foto.archivo)} />
            <DatosUbicacion ubicacion={foto.ubicacion} />
          </Tarjeta>
          <Aviso mensaje={{ tipo: 'info', texto: 'Revisa la foto y los resultados. Después de confirmar, el acta queda bloqueada incluso sin conexión.' }} />
          <Boton titulo="Confirmar definitivamente" tituloCarga="Guardando acta…" cargando={ocupado}
            alPulsar={() => void confirmarActa()} />
          <Boton titulo="Volver a evidencia" variante="secundario" deshabilitado={ocupado} alPulsar={() => avanzar(1)} />
          <Boton titulo="Volver a resultados" variante="secundario" deshabilitado={ocupado} alPulsar={() => avanzar(0)} />
        </>
      )}
      <Aviso mensaje={mensaje} />
    </Marco>
  );
}
