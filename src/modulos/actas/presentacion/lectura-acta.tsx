import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { IconoElectoral, PaisajeElectoral } from '@/compartido/presentacion/graficos-electorales';
import { superficieDestacada } from '@/compartido/presentacion/tema-electoral';
import { Aviso, Boton, colores, mensajeDeError, type Mensaje } from '@/modulos/acceso/presentacion/interfaz';
import { EstadoConsulta, EstadoRegistro, fechaLocal, ResumenGestion, Tarjeta, Texto, useConsulta } from '@/modulos/operacion/presentacion/componentes';

import type { RepositorioActas } from '../aplicacion/actas';
import { nombreDignidad, type Candidato, type Dignidad, type MesaElectoral, type ResultadosEnvio, type UbicacionEvidencia } from '../dominio/acta';
import { DatosUbicacion, FotoActa } from './evidencia-visual';
import { MapaEvidencia } from './mapa-evidencia';

export function CabeceraActa({ mesa, dignidad, registro }: { mesa: MesaElectoral; dignidad?: Dignidad; registro?: boolean }) {
  const junta = mesa.numeroJrv === null ? `Mesa interna ${mesa.numero}` : `JRV ${mesa.numeroJrv}`;
  return (
    <View style={[estilos.cabecera, registro && estilos.cabeceraRegistro]}>
      {!registro && <PaisajeElectoral />}
      <View style={estilos.filaEtiqueta}>
        <IconoElectoral nombre="urna" color={colores.amarillo} />
        <Text accessibilityRole={registro ? 'header' : undefined}
          style={[estilos.etiqueta, registro && estilos.etiquetaRegistro]}>
          {dignidad ? `Acta de ${nombreDignidad[dignidad]}` : 'Actas de escrutinio'}
        </Text>
      </View>
      <Text accessibilityRole={registro ? undefined : 'header'} style={[estilos.titulo, registro && estilos.mesaRegistro]}>
        {junta} · {{ F: 'Femenina', M: 'Masculina', X: 'Mixta' }[mesa.sexo]}
      </Text>
      <Text style={estilos.claro}>{mesa.recinto}{mesa.zona ? ` · Zona ${mesa.zona}` : ''}</Text>
      <Text style={estilos.claro}>Parroquia {mesa.parroquia} · Cantón {mesa.canton}</Text>
      <Text style={estilos.claro}>Provincia {mesa.provincia}</Text>
    </View>
  );
}

function ListaCandidatura({ candidato }: { candidato: Candidato }) {
  return (
    <View style={estilos.candidatura}>
      <Text style={estilos.nombreCandidato}>{candidato.nombre}</Text>
      {candidato.binomio && <Text style={estilos.organizacion}>{candidato.binomio}</Text>}
      <Text style={estilos.organizacion}>{candidato.organizacion}</Text>
      <View style={estilos.lista}>
        <View style={[estilos.muestra, { backgroundColor: candidato.color }]} aria-hidden />
        <Text style={estilos.numeroLista}>Lista {candidato.lista}</Text>
      </View>
      {candidato.simulacion && <Text style={estilos.organizacion}>Datos de simulación</Text>}
    </View>
  );
}

export function ResultadosActa({ datos, candidatos, validado }: { datos: ResultadosEnvio; candidatos: Candidato[]; validado?: boolean }) {
  const { resultados, votos } = datos;
  return (
    <>
      <Tarjeta titulo="Totales del acta" icono="seguimiento">
        {validado && <EstadoRegistro texto="Resultados validados" tono="positivo" />}
        <ResumenGestion datos={[
          { etiqueta: 'Votos blancos', cantidad: resultados.votos_blancos, icono: 'urna', tono: 'neutro' },
          { etiqueta: 'Votos nulos', cantidad: resultados.votos_nulos, icono: 'error', tono: 'negativo' },
          { etiqueta: 'Total de sufragantes', cantidad: resultados.total_sufragantes, icono: 'cuentas', tono: 'alerta' },
        ]} />
        {!!resultados.numero_acta && <Texto>Acta N.º {resultados.numero_acta}</Texto>}
        {!!resultados.codigo_control && <Texto>Control N.º {resultados.codigo_control}</Texto>}
      </Tarjeta>
      <Tarjeta titulo="Votación por lista" icono="cuentas">
        {votos.map((voto) => {
          const candidato = candidatos.find(({ id }) => id === voto.candidato_id);
          return (
            <View key={voto.candidato_id} style={[estilos.voto, candidato && { borderLeftColor: candidato.color }]}>
              <View style={estilos.descripcion}>
                {candidato ? <ListaCandidatura candidato={candidato} /> : <Texto>Candidatura {voto.candidato_id}</Texto>}
              </View>
              <View style={estilos.cantidadVoto}>
                <Text style={estilos.numeroVoto}>{voto.cantidad}</Text>
                <Text style={estilos.etiquetaVoto}>{voto.cantidad === 1 ? 'voto' : 'votos'}</Text>
              </View>
            </View>
          );
        })}
      </Tarjeta>
    </>
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
    <Tarjeta titulo="Evidencia del acta" icono="ubicacion">
      <DatosUbicacion ubicacion={ubicacion} />
      <Boton titulo={uri ? 'Ocultar fotografía' : 'Ver fotografía privada'} variante="secundario" icono="camara"
        cargando={cargando} alPulsar={() => void verFoto()} />
      {uri && <FotoActa uri={uri} />}
      <Aviso mensaje={mensaje} />
      <Boton titulo={mapa ? 'Ocultar mapa' : 'Ver ubicación en el mapa'} variante="secundario" icono="ubicacion" alPulsar={() => fijarMapa(!mapa)} />
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
          <Tarjeta titulo="Registro del acta" icono="escudo">
            <EstadoRegistro texto="Registrada en el sistema" tono="positivo" />
            <Texto>Fecha de confirmación: {fechaLocal(acta.confirmadaEn)}</Texto>
          </Tarjeta>
          <ResultadosActa candidatos={candidatos} datos={acta} />
          <EvidenciaPublicada ubicacion={acta.evidencia} ruta={acta.evidencia.ruta} repositorio={repositorio} />
        </>
      ) : <Texto>El acta no está disponible para tu asignación actual.</Texto>}
    </EstadoConsulta>
  );
}

const estilos = StyleSheet.create({
  cabecera: superficieDestacada,
  cabeceraRegistro: { backgroundColor: 'rgba(5, 25, 65, 0.94)', borderColor: '#A8BCE2', borderLeftColor: colores.amarillo, padding: 13, gap: 4 },
  filaEtiqueta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  etiqueta: { color: colores.amarillo, fontSize: 16, fontWeight: '800', flexShrink: 1 },
  etiquetaRegistro: { color: colores.blanco, fontSize: 26, fontWeight: '900' },
  mesaRegistro: {
    color: colores.azul, backgroundColor: colores.azulSuave, alignSelf: 'flex-start',
    paddingVertical: 3, paddingHorizontal: 8, marginVertical: 4, borderRadius: 8, fontSize: 17,
  },
  titulo: { color: colores.blanco, fontSize: 25, fontWeight: '800' },
  claro: { color: colores.azulSuave, fontSize: 16, lineHeight: 23 },
  candidatura: { gap: 3 },
  nombreCandidato: { color: colores.azul, fontSize: 17, fontWeight: '900' },
  organizacion: { color: colores.secundario, fontSize: 15, lineHeight: 20 },
  lista: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    gap: 5, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7, backgroundColor: colores.azulSuave,
  },
  muestra: { height: 10, width: 10, borderRadius: 5, borderWidth: 1, borderColor: '#74869B' },
  numeroLista: { color: colores.azul, fontSize: 13, fontWeight: '800', flexShrink: 1 },
  descripcion: { flex: 1 },
  voto: {
    flexDirection: 'row', alignItems: 'center', gap: 7, padding: 9, borderRadius: 11,
    borderWidth: 1, borderLeftWidth: 4, borderColor: colores.linea, backgroundColor: '#F6F9FF',
  },
  cantidadVoto: { alignItems: 'center', minWidth: 50, maxWidth: '38%', padding: 5, backgroundColor: colores.azulSuave, borderRadius: 9 },
  numeroVoto: { color: colores.azul, fontSize: 23, fontWeight: '900', textAlign: 'center', fontVariant: ['tabular-nums'] },
  etiquetaVoto: { color: colores.secundario, fontSize: 13, fontWeight: '700' },
});
