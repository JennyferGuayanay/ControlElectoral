import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import AnimacionCarga from '@/compartido/presentacion/animacion-carga';
import { Aviso, Boton, colores, Enlace, Marco, type Mensaje } from '@/modulos/acceso/presentacion/interfaz';
import { nombreDignidad, type Dignidad } from '@/modulos/actas/dominio/acta';
import type { RepositorioOperacion } from '@/modulos/operacion/aplicacion/operacion';
import { EstadoConsulta, EstadoRegistro, fechaLocal, Lista, Opciones, SelectorRecinto, Tarjeta, Texto } from '@/modulos/operacion/presentacion/componentes';

import { consultarResultados, type AlcanceResultados, type RepositorioSeguimiento } from '../aplicacion/seguimiento';
import { resumirAvance } from '../dominio/seguimiento';
import { CabeceraSeguimiento } from './cabecera-seguimiento';
import { MesasSeguimiento } from './mesas-seguimiento';
import { BarraAvance, numeroLocal, ResumenSeguimiento } from './resumen-seguimiento';
import { ResultadosSeguimiento } from './resultados-seguimiento';
import { claveDatosSeguimiento, useConexionSeguimiento } from './seguimiento-en-vivo';

const estadoRed: Record<ReturnType<typeof useConexionSeguimiento>, Mensaje> = {
  'en-vivo': { tipo: 'exito', texto: 'Actualización en vivo' },
  conectando: { tipo: 'info', texto: 'Conectando con el escrutinio…' },
  interrumpido: { tipo: 'info', texto: 'Canal en vivo interrumpido. Puedes actualizar mientras se reconecta.' },
  'sin-conexion': { tipo: 'info', texto: 'Sin conexión. Se muestran los últimos datos disponibles.' },
};

export function PantallaSeguimiento({ autor, recintoInicial, dignidadInicial, repositorio, territorio }: {
  autor: string; recintoInicial: number | null; dignidadInicial: Dignidad;
  repositorio: RepositorioSeguimiento; territorio: RepositorioOperacion;
}) {
  const conexion = useConexionSeguimiento();
  const conectado = conexion !== 'sin-conexion';
  const consultas = useQueryClient();
  const claveDatos = claveDatosSeguimiento(autor);
  const [dignidad, fijarDignidad] = useState(dignidadInicial);
  const [parroquiaId, fijarParroquia] = useState(0);
  const [recintoId, fijarRecinto] = useState<number | null>(recintoInicial);

  const catalogo = useQuery({
    queryKey: ['seguimiento', autor, 'territorio'], enabled: conectado, retry: 1, gcTime: 0,
    staleTime: 60_000,
    queryFn: async ({ signal }) => {
      const [parroquias, recintos, cantones] = await Promise.all([
        territorio.parroquias(), territorio.recintos(), repositorio.cantones(signal),
      ]);
      return { parroquias, recintos, cantones };
    },
  });
  const avance = useQuery({
    queryKey: [...claveDatos, 'avance'], enabled: conectado, retry: 1, gcTime: 0, staleTime: 12_000,
    queryFn: ({ signal }) => repositorio.avance(signal),
  });

  const recintos = (catalogo.data?.recintos ?? []).filter((recinto) => parroquiaId === 0 || recinto.parroquia_id === parroquiaId);
  const recinto = recintos.find(({ id }) => id === recintoId);
  const parroquia = catalogo.data?.parroquias.find(({ id }) => id === parroquiaId);
  const alcance: AlcanceResultados = recinto ? { tipo: 'recinto', id: recinto.id }
    : parroquia ? { tipo: 'parroquia', id: parroquia.id, recintoIds: recintos.map(({ id }) => id) } : { tipo: 'provincia' };
  const resultados = useQuery({
    queryKey: [...claveDatos, 'resultados', dignidad, alcance], enabled: conectado && !!catalogo.data,
    gcTime: 0, retry: 1, staleTime: 12_000,
    queryFn: ({ signal }) => consultarResultados(repositorio, dignidad, alcance, signal),
  });
  const ids = new Set(recintos.map(({ id }) => id));
  const avanceFiltrado = (avance.data ?? []).filter((dato) =>
    recinto ? dato.recinto_id === recinto.id : parroquia ? ids.has(dato.recinto_id) : true);
  const parroquiasPorId = new Map(catalogo.data?.parroquias.map((dato) => [dato.id, dato]));
  const parroquiaRecinto = recinto ? parroquiasPorId.get(recinto.parroquia_id) : undefined;
  const cantonesConRecintos = new Set<string>();
  for (const dato of recintos) {
    const nombre = parroquiasPorId.get(dato.parroquia_id)?.canton?.nombre;
    if (nombre) cantonesConRecintos.add(nombre);
  }
  const ambito = recinto?.nombre ?? parroquia?.nombre ?? 'Recintos de la jurisdicción';
  const detalleAmbito = recinto
    ? [parroquiaRecinto && `Parroquia ${parroquiaRecinto.nombre}`, parroquiaRecinto?.canton && `Cantón ${parroquiaRecinto.canton.nombre}`]
      .filter(Boolean).join(' · ')
    : parroquia
      ? parroquia.canton && `Parroquia · Cantón ${parroquia.canton.nombre}`
      : cantonesConRecintos.size === 1
        ? `Recintos cargados del cantón ${[...cantonesConRecintos][0]}`
        : undefined;
  const ultima = avance.dataUpdatedAt && resultados.dataUpdatedAt
    ? Math.min(avance.dataUpdatedAt, resultados.dataUpdatedAt) : avance.dataUpdatedAt;
  const cargando = avance.isFetching || catalogo.isFetching || resultados.isFetching;

  function actualizar() {
    void consultas.invalidateQueries({ queryKey: ['seguimiento', autor] });
  }

  return (
    <Marco key={recinto?.id ?? 'general'}
      cabecera={<CabeceraSeguimiento ambito={ambito} detalle={detalleAmbito || undefined} />}>
      <View style={estilos.acciones}>
        <View style={estilos.volver}><Enlace href="/provincial" texto="Volver al inicio" icono="atras" centrado reemplazar /></View>
        <Boton titulo="Actualizar tablero" tituloCarga="Actualizando…" variante="secundario" cargando={cargando}
          style={estilos.actualizar} deshabilitado={!conectado} alPulsar={actualizar} />
      </View>
      <View style={estilos.actualizacion}>
        <Aviso mensaje={estadoRed[conexion]} />
        {!!ultima && <Texto>Última actualización: {fechaLocal(new Date(ultima).toISOString())}</Texto>}
      </View>
      {!conectado && !catalogo.data ? <Texto>Conéctate para cargar el tablero de tu jurisdicción.</Texto> : (
        <EstadoConsulta consulta={{
          isPending: !catalogo.data && catalogo.isPending, isError: !catalogo.data && catalogo.isError, refetch: catalogo.refetch,
        }} ilustracionCarga={<AnimacionCarga />}>
          <EstadoConsulta consulta={{
            isPending: !avance.data && avance.isPending && conectado,
            isError: !avance.data && avance.isError && conectado, refetch: avance.refetch,
          }} ilustracionCarga={<AnimacionCarga />}>
            {avance.isError && avance.data && <Texto>No se pudo actualizar el avance. Se muestran los últimos datos.</Texto>}
            {avance.data ? <ResumenSeguimiento recintos={avanceFiltrado} />
              : <Texto>Conéctate para consultar el avance.</Texto>}
          </EstadoConsulta>
          <Tarjeta titulo="Filtros del tablero" icono="ubicacion">
            <Texto destacado>Parroquia</Texto>
            <Opciones<number> valor={parroquiaId} elegir={(id) => { fijarParroquia(id); fijarRecinto(null); }}
              opciones={[{ id: 0, texto: 'Todas las parroquias' }, ...(catalogo.data?.parroquias ?? [])
                .map((dato) => ({ id: dato.id, texto: dato.nombre }))]} />
            <SelectorRecinto recintos={recintos} recintoId={recinto?.id ?? null} elegir={fijarRecinto} />
            {recinto && <Boton titulo="Ver todos los recintos" variante="secundario" alPulsar={() => fijarRecinto(null)} />}
          </Tarjeta>
          <Tarjeta titulo="Resultados electorales" icono="seguimiento">
            <Texto>Conteo preliminar · Resultados no oficiales del CNE.</Texto>
            <Opciones<Dignidad> valor={dignidad} elegir={fijarDignidad}
              opciones={[{ id: 'alcaldia', texto: nombreDignidad.alcaldia }, { id: 'prefectura', texto: nombreDignidad.prefectura }]} />
          </Tarjeta>
          <EstadoConsulta consulta={{
            isPending: !resultados.data && resultados.isPending && conectado,
            isError: !resultados.data && resultados.isError && conectado, refetch: resultados.refetch,
          }} ilustracionCarga={<AnimacionCarga />}>
            {resultados.isError && resultados.data && <Texto>No se pudieron actualizar los votos. Se muestran los últimos datos.</Texto>}
            {resultados.data ? (
              <ResultadosSeguimiento totales={resultados.data} cantones={catalogo.data?.cantones ?? []} />
            ) : <Texto>Conéctate para consultar resultados de esta selección.</Texto>}
          </EstadoConsulta>
          {recinto ? (
            <MesasSeguimiento key={recinto.id} autor={autor} recintoId={recinto.id} dignidad={dignidad}
              conectado={conectado} repositorio={repositorio} territorio={territorio} />
          ) : (
            <Tarjeta titulo="Seguimiento por recinto" icono="territorio">
              <EstadoRegistro texto={`${numeroLocal.format(recintos.length)} recintos en la selección`} tono="neutro" />
              <Lista key={parroquiaId} datos={recintos} clave={(dato) => dato.id} vacio="No hay recintos en esta selección."
                mostrar={(dato) => {
                  const fila = avanceFiltrado.find(({ recinto_id }) => recinto_id === dato.id);
                  const resumen = fila ? resumirAvance([fila]) : null;
                  const completo = !!resumen?.esperadas && resumen.actas === resumen.esperadas;
                  return (
                    <Tarjeta titulo={dato.nombre} icono="ubicacion">
                      {resumen ? (
                        <>
                          <EstadoRegistro texto={!resumen.esperadas ? 'Sin mesas' : completo ? 'Completo' : resumen.actas ? 'Parcial' : 'Pendiente'}
                            tono={!resumen.esperadas ? 'neutro' : completo ? 'positivo' : 'alerta'} />
                          <Texto>{numeroLocal.format(resumen.mesas)} {resumen.mesas === 1 ? 'mesa' : 'mesas'}</Texto>
                          <Texto>{numeroLocal.format(resumen.actas)} de {numeroLocal.format(resumen.esperadas)} actas</Texto>
                          {!!resumen.esperadas && (
                            <View style={estilos.avanceRecinto}>
                              <Texto destacado>{numeroLocal.format(resumen.porcentaje)} % de avance</Texto>
                              <BarraAvance porcentaje={resumen.porcentaje} />
                            </View>
                          )}
                        </>
                      ) : <EstadoRegistro texto="Avance no disponible" tono="neutro" />}
                      <Boton titulo="Ver seguimiento del recinto" variante="secundario" icono="siguiente" alPulsar={() => fijarRecinto(dato.id)} />
                    </Tarjeta>
                  );
                }} />
            </Tarjeta>
          )}
        </EstadoConsulta>
      )}
    </Marco>
  );
}

const estilos = StyleSheet.create({
  acciones: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  volver: { alignSelf: 'flex-start', backgroundColor: colores.azulSuave, borderRadius: 13 },
  actualizar: { paddingHorizontal: 8 },
  actualizacion: { gap: 7 },
  avanceRecinto: { backgroundColor: '#EAF2FF', borderRadius: 10, padding: 9, gap: 7 },
});
