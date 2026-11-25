import { useNetInfo } from '@react-native-community/netinfo';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { Aviso, Boton, Enlace, mensajeDeError, type Mensaje } from '@/modulos/acceso/presentacion/interfaz';
import { EstadoConsulta, EstadoRegistro, fechaLocal, Pantalla, Tarjeta, Texto } from '@/modulos/operacion/presentacion/componentes';

import type { ServicioActas } from '../aplicacion/actas';
import type { SincronizadorActas } from '../aplicacion/sincronizacion';
import { catalogoCompleto, dignidades, nombreDignidad, type ActaConfirmada, type Borrador, type Dignidad } from '../dominio/acta';
import { EditorActa } from './editor-acta';
import { FotoActa, TarjetaUbicacion } from './evidencia-visual';
import { useEstadoLocalActas } from './estado-local-actas';
import { EstadoSincronizacion } from './estado-sincronizacion';
import { CabeceraActa, DetallePublicado, ResultadosActa } from './lectura-acta';
import { TableroSincronizacion } from './tablero-sincronizacion';

export function PantallaActas({ servicio, sincronizador, autorId, dignidad, soloSincronizacion }: {
  servicio: ServicioActas; sincronizador: SincronizadorActas; autorId: string;
  dignidad?: Dignidad; soloSincronizacion?: boolean;
}) {
  const red = useNetInfo();
  const sinConexion = red.isConnected === false || red.isInternetReachable === false;
  const mesa = useQuery({
    queryKey: ['actas', autorId, 'mesa'], gcTime: 0,
    queryFn: () => servicio.consultarMesa(autorId), enabled: !sinConexion && !soloSincronizacion, retry: false,
  });
  const guardadas = useEstadoLocalActas(servicio, sincronizador, autorId, mesa.data?.mesa.id);
  const contexto = sinConexion && mesa.data === undefined ? guardadas.datos?.contexto : mesa.data;
  const mesaId = contexto?.mesa.id;
  const entradas = guardadas.datos?.cola ?? [];
  const mesaConError = !sinConexion && mesa.isError;
  const conectado = red.isConnected === true && red.isInternetReachable !== false;

  const [editor, fijarEditor] = useState<Borrador>();
  const [seleccionada, fijarLocal] = useState<ActaConfirmada>();
  const actual = guardadas.datos?.registros.find((registro) => registro.id === seleccionada?.id);
  const local = actual && actual.estado !== 'borrador' ? actual : seleccionada;
  const [publicada, fijarPublicada] = useState<{ id: string; dignidad: Dignidad }>();
  const [abriendo, fijarAbriendo] = useState<Dignidad>();
  const [mensaje, fijarMensaje] = useState<Mensaje>();
  const dignidadesVisibles = dignidad ? [dignidad] : dignidades;
  const consultaLocal = { isPending: guardadas.cargando, isError: guardadas.error, refetch: guardadas.recargar };

  async function abrir(dignidad: Dignidad) {
    const candidatos = contexto?.contiendas.find((contienda) => contienda.dignidad === dignidad)?.candidatos ?? [];
    if (mesaId === undefined || !catalogoCompleto(candidatos)) return;
    fijarAbriendo(dignidad);
    fijarMensaje(undefined);
    try {
      const registro = await servicio.abrir({ autorId, mesaId }, dignidad, candidatos);
      if (registro.estado === 'borrador') fijarEditor(registro);
      else fijarLocal(registro);
    } catch (error) {
      fijarMensaje(mensajeDeError(error, 'No pudimos abrir el acta.'));
    } finally {
      fijarAbriendo(undefined);
    }
  }

  async function reintentar(acta: ActaConfirmada) {
    fijarMensaje(undefined);
    try {
      await sincronizador.reintentar(acta);
    } catch (error) {
      fijarMensaje(mensajeDeError(error, 'El reintento no se pudo programar. El acta sigue guardada.'));
    }
  }

  function confirmada(acta: ActaConfirmada) {
    fijarEditor(undefined);
    fijarLocal(acta);
    fijarMensaje(undefined);
    guardadas.recargar();
  }

  function inicio() {
    fijarLocal(undefined);
    fijarPublicada(undefined);
    fijarEditor(undefined);
    fijarMensaje(undefined);
    guardadas.recargar();
  }

  if (soloSincronizacion) {
    const idsEnCola = new Set(entradas.map(({ acta }) => acta.id));
    const finalizadas = (guardadas.datos?.registros ?? []).filter(
      (acta): acta is ActaConfirmada => (acta.estado === 'enviada' || acta.estado === 'conflicto') && !idsEnCola.has(acta.id),
    );
    return (
      <TableroSincronizacion entradas={entradas} finalizadas={finalizadas} consulta={consultaLocal}
        mesa={guardadas.datos?.contexto?.mesa} conectado={conectado} mensaje={mensaje}
        reintentar={(acta) => void reintentar(acta)} />
    );
  }

  if (contexto && !mesaConError && editor && editor.mesaId === mesaId) {
    const candidatos = contexto.contiendas.find((contienda) => contienda.dignidad === editor.dignidad)?.candidatos ?? [];
    if (catalogoCompleto(candidatos)) {
      return <EditorActa key={editor.id} servicio={servicio} mesa={contexto.mesa} candidatos={candidatos} inicial={editor}
        salir={inicio} confirmar={confirmada} />;
    }
  }

  if (contexto && !mesaConError && local && local.mesaId === mesaId) {
    const candidatos = contexto.contiendas.find((contienda) => contienda.dignidad === local.dignidad)?.candidatos ?? [];
    return (
      <Pantalla titulo="Acta confirmada" inicio="/veedor" iconoGestion="escudo">
        <CabeceraActa mesa={contexto.mesa} dignidad={local.dignidad} />
        <Tarjeta titulo="Estado del acta" icono="sincronizacion">
          <Aviso mensaje={{ tipo: 'exito', texto: 'Acta confirmada y guardada en este dispositivo.' }} />
          <Texto>Versión bloqueada desde {fechaLocal(local.confirmadaEn)}</Texto>
          <EstadoSincronizacion acta={local} entrada={entradas.find(({ acta }) => acta.id === local.id)} conectado={conectado}
            reintentar={() => void reintentar(local)} />
          <Aviso mensaje={mensaje} />
        </Tarjeta>
        <Boton titulo="Volver a mis actas" variante="secundario" icono="atras" alPulsar={inicio} />
        <ResultadosActa candidatos={candidatos} datos={local.datos} />
        <Tarjeta titulo="Evidencia local" icono="camara">
          <FotoActa uri={servicio.archivos.uri(autorId, local.foto.archivo)} />
        </Tarjeta>
        <TarjetaUbicacion ubicacion={local.foto.ubicacion} />
      </Pantalla>
    );
  }

  const actaVisible = contexto?.registradas.some(({ id }) => id === publicada?.id);
  if (contexto && !mesaConError && publicada && actaVisible) {
    const candidatos = contexto.contiendas.find((contienda) => contienda.dignidad === publicada.dignidad)?.candidatos ?? [];
    return (
      <Pantalla titulo="Acta registrada" inicio="/veedor">
        <Boton titulo="Volver a mis actas" variante="secundario" alPulsar={inicio} />
        <CabeceraActa mesa={contexto.mesa} dignidad={publicada.dignidad} />
        <DetallePublicado key={publicada.id} id={publicada.id} candidatos={candidatos} repositorio={servicio.remoto} />
      </Pantalla>
    );
  }

  return (
    <Pantalla titulo={dignidad ? `Acta de ${nombreDignidad[dignidad]}` : 'Mis actas'} inicio="/veedor">
      {dignidad && <Enlace href="/actas" texto="Ver las dos actas" icono="actas" />}
      {sinConexion && <Aviso mensaje={{ tipo: 'info', texto: 'Sin conexión. Puedes trabajar con la mesa que ya consultaste y conservar las actas confirmadas.' }} />}
      <Boton titulo="Actualizar mis actas" variante="secundario" cargando={mesa.isFetching} deshabilitado={sinConexion}
        alPulsar={() => { void mesa.refetch(); guardadas.recargar(); }} />
      <Aviso mensaje={mensaje} />
      {entradas.length > 0 && <Texto>Conserva la aplicación instalada mientras tengas actas sin sincronizar.</Texto>}
      {entradas.filter(({ acta }) =>
        (!dignidad || acta.dignidad === dignidad) && (mesaConError || acta.mesaId !== mesaId)).map((entrada) => (
        <Tarjeta key={entrada.acta.id} titulo={`Envío de ${nombreDignidad[entrada.acta.dignidad]}`}>
          <EstadoSincronizacion acta={entrada.acta} entrada={entrada} conectado={conectado}
            reintentar={() => void reintentar(entrada.acta)} />
        </Tarjeta>
      ))}
      <EstadoConsulta consulta={sinConexion ? consultaLocal : mesa}>
        {contexto ? (
          <>
            <CabeceraActa mesa={contexto.mesa} dignidad={dignidad} />
            <EstadoConsulta consulta={consultaLocal}>
              {dignidadesVisibles.map((dignidad) => {
                const guardada = guardadas.datos?.registros.find((acta) => acta.mesaId === mesaId && acta.dignidad === dignidad);
                const registrada = contexto.registradas.find((acta) => acta.dignidad === dignidad);
                const candidatos = contexto.contiendas.find((contienda) => contienda.dignidad === dignidad)?.candidatos ?? [];
                const disponible = catalogoCompleto(candidatos);
                const confirmada = guardada && guardada.estado !== 'borrador' ? guardada : null;
                return (
                  <Tarjeta key={dignidad} titulo={nombreDignidad[dignidad]} icono="actas">
                    {confirmada ? (
                      <EstadoSincronizacion acta={confirmada} entrada={entradas.find(({ acta }) => acta.id === confirmada.id)}
                        conectado={conectado} reintentar={() => void reintentar(confirmada)} />
                    ) : (
                      <EstadoRegistro texto={registrada ? 'Registrada en Supabase' : guardada ? 'Borrador guardado' : 'Por registrar'}
                        tono={registrada ? 'positivo' : guardada ? 'neutro' : 'alerta'} />
                    )}
                    {registrada && (
                      <Boton titulo="Consultar acta registrada" variante="secundario" deshabilitado={sinConexion}
                        alPulsar={() => { fijarMensaje(undefined); fijarPublicada(registrada); }} />
                    )}
                    {confirmada && (
                      <Boton titulo={registrada ? 'Ver copia local bloqueada' : 'Consultar acta confirmada'} variante="secundario"
                        alPulsar={() => { fijarMensaje(undefined); fijarLocal(confirmada); }} />
                    )}
                    {!registrada && !confirmada && (
                      <Boton titulo={guardada ? `Continuar borrador de ${nombreDignidad[dignidad]}` : `Registrar acta de ${nombreDignidad[dignidad]}`}
                        cargando={abriendo === dignidad} deshabilitado={!disponible || abriendo !== undefined}
                        alPulsar={() => void abrir(dignidad)} />
                    )}
                    {!disponible && !registrada && <Texto>Se necesitan las cinco candidaturas para registrar el acta.</Texto>}
                  </Tarjeta>
                );
              })}
            </EstadoConsulta>
          </>
        ) : <Tarjeta titulo={sinConexion ? 'Mesa todavía no descargada' : 'Sin mesa asignada'}>
          <Texto>{sinConexion ? 'Conéctate y consulta tu mesa antes de registrar un acta.' : 'Consulta con tu coordinador de recinto.'}</Texto>
        </Tarjeta>}
      </EstadoConsulta>
    </Pantalla>
  );
}
