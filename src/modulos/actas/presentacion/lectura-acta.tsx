import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Aviso, Boton, colores, mensajeDeError, type Mensaje } from '@/modulos/acceso/presentacion/interfaz';
import { EstadoConsulta, fechaLocal, Tarjeta, Texto, useConsulta } from '@/modulos/operacion/presentacion/componentes';

import type { RepositorioActas } from '../aplicacion/actas';
import { nombreDignidad, type Candidato, type Dignidad, type MesaElectoral, type ResultadosEnvio, type UbicacionEvidencia } from '../dominio/acta';
import { MapaEvidencia } from './mapa-evidencia';

export function CabeceraActa({ mesa, dignidad }: { mesa: MesaElectoral; dignidad?: Dignidad }) {
  const junta = mesa.numeroJrv === null ? `Mesa interna ${mesa.numero}` : `JRV ${mesa.numeroJrv}`;
  return (
    <View style={estilos.cabecera}>
      <Text style={estilos.etiqueta}>{dignidad ? `ACTA DE ${nombreDignidad[dignidad].toUpperCase()}` : 'ACTAS DE ESCRUTINIO'}</Text>
      <Text accessibilityRole="header" style={estilos.titulo}>{junta} · {{ F: 'Femenina', M: 'Masculina', X: 'Mixta' }[mesa.sexo]}</Text>
      <Text style={estilos.claro}>{mesa.recinto}{mesa.zona ? ` · Zona ${mesa.zona}` : ''}</Text>
      <Text style={estilos.claro}>Parroquia {mesa.parroquia} · Cantón {mesa.canton}</Text>
      <Text style={estilos.claro}>Provincia {mesa.provincia}</Text>
    </View>
  );
}

export function ListaCandidatura({ candidato }: { candidato: Candidato }) {
  return (
    <View style={estilos.fila}>
      <View style={[estilos.muestra, { backgroundColor: candidato.color }]} accessible={false} />
      <View style={estilos.descripcion}>
        <Texto destacado>Lista {candidato.lista} · {candidato.organizacion}</Texto>
        <Texto>{candidato.nombre}{candidato.binomio ? ` / ${candidato.binomio}` : ''}</Texto>
        {candidato.simulacion && <Texto>Datos de simulación</Texto>}
      </View>
    </View>
  );
}

export function ResultadosActa({ datos, candidatos }: { datos: ResultadosEnvio; candidatos: Candidato[] }) {
  const { resultados, votos } = datos;
  return (
    <>
      <Tarjeta titulo="Totales del acta">
        {!!resultados.numero_acta && <Texto>Acta N.º {resultados.numero_acta}</Texto>}
        {!!resultados.codigo_control && <Texto>Control N.º {resultados.codigo_control}</Texto>}
        <Texto destacado>Total de sufragantes: {resultados.total_sufragantes}</Texto>
        <Texto>Votos blancos: {resultados.votos_blancos}</Texto>
        <Texto>Votos nulos: {resultados.votos_nulos}</Texto>
      </Tarjeta>
      <Tarjeta titulo="Votación por lista">
        {votos.map((voto) => {
          const candidato = candidatos.find(({ id }) => id === voto.candidato_id);
          return (
            <View key={voto.candidato_id} style={estilos.voto}>
              {candidato ? <ListaCandidatura candidato={candidato} /> : <Texto>Candidatura {voto.candidato_id}</Texto>}
              <Texto destacado>{voto.cantidad} votos</Texto>
            </View>
          );
        })}
      </Tarjeta>
    </>
  );
}

export function DatosUbicacion({ ubicacion }: { ubicacion: UbicacionEvidencia }) {
  return (
    <>
      <Texto>Latitud {ubicacion.latitud.toFixed(6)} · Longitud {ubicacion.longitud.toFixed(6)}</Texto>
      <Texto>Precisión: {ubicacion.precision_metros.toFixed(1)} m</Texto>
      <Texto>Captura: {fechaLocal(ubicacion.capturada_en)}</Texto>
      <Texto>{ubicacion.ubicacion_simulada ? 'Ubicación simulada detectada' : 'El dispositivo no reportó ubicación simulada'}</Texto>
    </>
  );
}

export function FotoActa({ uri }: { uri: string }) {
  return (
    <Image source={{ uri }} style={estilos.foto} contentFit="contain" cachePolicy="none"
      accessibilityLabel="Fotografía de respaldo del acta" />
  );
}

function EvidenciaPublicada({ ubicacion, ruta, repositorio }: {
  ubicacion: UbicacionEvidencia; ruta: string; repositorio: RepositorioActas;
}) {
  const [uri, fijarUri] = useState<string>();
  const [cargando, fijarCargando] = useState(false);
  const [mapa, fijarMapa] = useState(false);
  const [mensaje, fijarMensaje] = useState<Mensaje>();

  useEffect(() => {
    if (!uri) return;
    const reloj = setTimeout(() => fijarUri(undefined), 85_000);
    return () => clearTimeout(reloj);
  }, [uri]);

  async function verFoto() {
    if (uri) { fijarUri(undefined); return; }
    fijarCargando(true);
    fijarMensaje(undefined);
    try {
      fijarUri(await repositorio.enlaceFoto(ruta));
    } catch (error) {
      fijarMensaje(mensajeDeError(error, 'No se pudo consultar la evidencia.'));
    } finally {
      fijarCargando(false);
    }
  }

  return (
    <Tarjeta titulo="Evidencia del acta">
      <DatosUbicacion ubicacion={ubicacion} />
      <Boton titulo={uri ? 'Ocultar fotografía' : 'Ver fotografía privada'} variante="secundario"
        cargando={cargando} alPulsar={() => void verFoto()} />
      {uri && <FotoActa uri={uri} />}
      <Aviso mensaje={mensaje} />
      <Boton titulo={mapa ? 'Ocultar mapa' : 'Ver ubicación en el mapa'} variante="secundario" alPulsar={() => fijarMapa(!mapa)} />
      {mapa && <MapaEvidencia ubicacion={ubicacion} />}
    </Tarjeta>
  );
}

export function DetallePublicado({ id, candidatos, repositorio }: { id: string; candidatos: Candidato[]; repositorio: RepositorioActas }) {
  const consulta = useConsulta(['acta-publicada', id], () => repositorio.actaPublicada(id));
  const acta = consulta.data;
  return (
    <EstadoConsulta consulta={consulta}>
      {acta ? (
        <>
          <Aviso mensaje={{ tipo: 'info', texto: `Acta definitiva confirmada el ${fechaLocal(acta.confirmadaEn)}.` }} />
          <ResultadosActa candidatos={candidatos} datos={acta} />
          <EvidenciaPublicada ubicacion={acta.evidencia} ruta={acta.evidencia.ruta} repositorio={repositorio} />
        </>
      ) : <Texto>El acta no está disponible para tu asignación actual.</Texto>}
    </EstadoConsulta>
  );
}

const estilos = StyleSheet.create({
  cabecera: { borderRadius: 17, backgroundColor: colores.azul, padding: 19, gap: 5,
    borderLeftColor: colores.amarillo, borderLeftWidth: 6 },
  etiqueta: { color: '#F9D95E', fontSize: 14, fontWeight: '800', letterSpacing: 0.6 },
  titulo: { color: colores.blanco, fontSize: 25, fontWeight: '800' },
  claro: { color: '#EEF4FF', fontSize: 16, lineHeight: 22 },
  fila: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  muestra: { height: 17, width: 17, borderRadius: 5, marginTop: 5, borderWidth: 1, borderColor: '#74869B' },
  descripcion: { flex: 1 },
  voto: { paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colores.linea, gap: 5 },
  foto: { width: '100%', aspectRatio: 0.82, borderRadius: 10, backgroundColor: '#24344B' },
});
