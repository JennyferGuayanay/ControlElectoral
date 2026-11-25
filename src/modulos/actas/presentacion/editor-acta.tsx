import { useState } from 'react';

import { Aviso, Boton, Marco, mensajeDeError, type Mensaje } from '@/modulos/acceso/presentacion/interfaz';
import { EstadoRegistro, Tarjeta, Texto } from '@/modulos/operacion/presentacion/componentes';

import type { ServicioActas } from '../aplicacion/actas';
import { prepararEnvio, type ActaConfirmada, type Borrador, type Candidato, type MesaElectoral, type UbicacionEvidencia, type ValoresActa } from '../dominio/acta';
import { CabeceraRegistroActa, EtapasActa } from './cabecera-registro-acta';
import { CapturaFoto } from './captura-foto';
import { EncuadreDocumento, FotoActa, TarjetaUbicacion } from './evidencia-visual';
import { FormularioActa } from './formulario-acta';
import { ResultadosActa } from './lectura-acta';

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
    <Marco key={etapa} ajustarTeclado={etapa === 0}
      cabecera={<CabeceraRegistroActa mesa={mesa} dignidad={borrador.dignidad} />}>
      <EtapasActa etapa={etapa} />
      {etapa === 0 && <FormularioActa inicial={borrador.valores} candidatos={candidatos} guardar={guardar} />}
      {etapa === 1 && (
        <>
          <Tarjeta titulo="Fotografía del acta" icono="camara">
            {captura ? <CapturaFoto aceptar={aceptar} /> : (
              <>
                {foto ? (
                  <>
                    <EstadoRegistro texto="Fotografía aceptada" tono="positivo" />
                    <FotoActa uri={servicio.archivos.uri(borrador.autorId, foto.archivo)} />
                  </>
                ) : (
                  <>
                    <Texto>Coloca el acta sobre una superficie plana, con buena luz y sin reflejos.</Texto>
                    <EncuadreDocumento />
                    <Texto>Incluye las cuatro esquinas de la hoja y comprueba que las cifras se lean con claridad.</Texto>
                  </>
                )}
                <Boton titulo={foto ? 'Tomar otra fotografía' : 'Abrir cámara'} icono="camara" alPulsar={() => {
                  fijarMensaje(undefined);
                  fijarCaptura(true);
                }} />
              </>
            )}
          </Tarjeta>
          {!captura && <TarjetaUbicacion ubicacion={foto?.ubicacion} />}
          {!captura && <Boton titulo="Continuar a revisión" icono="flecha" deshabilitado={!foto} alPulsar={() => avanzar(2)} />}
          {captura ? <Boton titulo="Cerrar cámara" variante="secundario" alPulsar={() => fijarCaptura(false)} />
            : <Boton titulo="Volver a resultados" variante="secundario" alPulsar={() => avanzar(0)} />}
          {!captura && <Boton titulo="Salir a mis actas" variante="secundario" alPulsar={salir} />}
        </>
      )}
      {etapa === 2 && foto && (
        <>
          <ResultadosActa candidatos={candidatos} datos={prepararEnvio(borrador.valores, candidatos)} validado />
          <Tarjeta titulo="Evidencia aceptada" icono="camara">
            <FotoActa uri={servicio.archivos.uri(borrador.autorId, foto.archivo)} />
          </Tarjeta>
          <TarjetaUbicacion ubicacion={foto.ubicacion} />
          <Tarjeta titulo="Confirmación definitiva" icono="escudo">
            <EstadoRegistro texto="Edición bloqueada después de confirmar" tono="alerta" />
            <Texto>Revisa la fotografía y los resultados. Después de confirmar, el acta no podrá modificarse, incluso sin conexión.</Texto>
            <Aviso mensaje={mensaje} />
            <Boton titulo="Confirmar definitivamente" tituloCarga="Guardando acta…" cargando={ocupado}
              icono="escudo" alPulsar={() => void confirmarActa()} />
            <Boton titulo="Volver a resultados" variante="secundario" icono="atras"
              deshabilitado={ocupado} alPulsar={() => avanzar(0)} />
            <Boton titulo="Volver a evidencia" variante="secundario" icono="camara"
              deshabilitado={ocupado} alPulsar={() => avanzar(1)} />
          </Tarjeta>
        </>
      )}
      {etapa !== 2 && <Aviso mensaje={mensaje} />}
    </Marco>
  );
}
