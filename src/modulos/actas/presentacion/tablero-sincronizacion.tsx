import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition, ReduceMotion } from 'react-native-reanimated';

import AnimacionCarga from '@/compartido/presentacion/animacion-carga';
import {
  FranjaTricolor, IconoElectoral, LogotipoElectoral, OndaTricolor, PaisajeElectoral,
} from '@/compartido/presentacion/graficos-electorales';
import { colores } from '@/compartido/presentacion/tema-electoral';
import IndicadorConexion from '@/modulos/acceso/presentacion/indicador-conexion';
import { Aviso, Enlace, Marco, type Mensaje } from '@/modulos/acceso/presentacion/interfaz';
import { EstadoConsulta, fechaLocal, ResumenGestion, Tarjeta, Texto } from '@/modulos/operacion/presentacion/componentes';

import type { EntradaCola } from '../aplicacion/sincronizacion';
import { nombreDignidad, type ActaConfirmada, type MesaElectoral } from '../dominio/acta';
import { EstadoSincronizacion, estadoEnvio, estadosEnvio } from './estado-sincronizacion';

const entrada = FadeInDown.duration(230).reduceMotion(ReduceMotion.System);
const movimiento = LinearTransition.duration(330).reduceMotion(ReduceMotion.System);
const formatoPorcentaje = new Intl.NumberFormat('es-EC', { style: 'percent', maximumFractionDigits: 1 });
const ordenEstados = ['pendiente', 'sincronizando', 'enviada', 'error', 'conflicto'] as const;

type Envio = { acta: ActaConfirmada; entrada?: EntradaCola };

function CabeceraSincronizacion({ mesa }: { mesa?: MesaElectoral }) {
  return (
    <View style={estilos.portada}>
      <PaisajeElectoral portada />
      <View style={[estilos.columna, estilos.portadaContenido]}>
        <View style={estilos.barra}>
          <View style={estilos.marca}>
            <LogotipoElectoral />
            <View style={estilos.marcaNombre}>
              <Text style={estilos.control}>Control Electoral</Text>
              <FranjaTricolor estrecha />
            </View>
          </View>
          <IndicadorConexion cabecera />
        </View>
        <Animated.View entering={entrada} style={estilos.portadaTextos}>
          <View style={estilos.titular}>
            <IconoElectoral nombre="sincronizacion" tamano={33} color={colores.amarillo} />
            <Text accessibilityRole="header" style={estilos.titulo}>Estado de sincronización</Text>
          </View>
          {mesa && (
            <View style={estilos.jurisdiccion}>
              <IconoElectoral nombre="ubicacion" tamano={17} color={colores.amarillo} />
              <Text style={estilos.jurisdiccionTexto}>{mesa.canton} · {mesa.provincia}</Text>
            </View>
          )}
        </Animated.View>
      </View>
      <View pointerEvents="none" style={estilos.onda}><OndaTricolor posicion="pie" amplia /></View>
    </View>
  );
}

function DetalleEnvio({ envio, mesa, conectado, reintentar }: {
  envio: Envio; mesa?: MesaElectoral; conectado: boolean; reintentar(acta: ActaConfirmada): void;
}) {
  const { acta, entrada: registroCola } = envio;
  const estado = estadoEnvio(acta, registroCola);
  const mesaVisible = mesa?.id === acta.mesaId ? mesa : undefined;
  const rotulo = mesaVisible
    ? mesaVisible.numeroJrv === null ? `Mesa interna ${mesaVisible.numero}` : `JRV ${mesaVisible.numeroJrv}`
    : `Mesa (ID interno ${acta.mesaId})`;

  return (
    <Tarjeta titulo={`Acta de ${nombreDignidad[acta.dignidad]}`} icono={estadosEnvio[estado].icono}>
      <Texto destacado>{rotulo}</Texto>
      <View style={estilos.metadatos}>
        <View style={estilos.metadato}>
          <IconoElectoral nombre="coordinacion" tamano={19} />
          <Text style={estilos.detalle}>Confirmada: {fechaLocal(acta.confirmadaEn)}</Text>
        </View>
        {!!acta.foto.archivo && (
          <View style={estilos.metadato}>
            <IconoElectoral nombre="camara" tamano={19} />
            <Text style={estilos.detalle}>Fotografía asociada</Text>
          </View>
        )}
      </View>
      <EstadoSincronizacion acta={acta} entrada={registroCola} conectado={conectado} reintentar={() => reintentar(acta)} />
    </Tarjeta>
  );
}

export function TableroSincronizacion({ entradas, finalizadas, consulta, mesa, conectado, mensaje, reintentar }: {
  entradas: EntradaCola[]; finalizadas: ActaConfirmada[];
  consulta: { isPending: boolean; isError: boolean; refetch(): unknown };
  mesa?: MesaElectoral; conectado: boolean; mensaje?: Mensaje; reintentar(acta: ActaConfirmada): void;
}) {
  const envios: Envio[] = [
    ...entradas.map((registro) => ({ acta: registro.acta, entrada: registro })),
    ...finalizadas.map((acta) => ({ acta })),
  ];
  envios.sort((a, b) => Date.parse(b.acta.confirmadaEn) - Date.parse(a.acta.confirmadaEn));

  const cantidades: Record<keyof typeof estadosEnvio, number> = {
    pendiente: 0, sincronizando: 0, enviada: 0, error: 0, conflicto: 0,
  };
  for (const envio of envios) cantidades[estadoEnvio(envio.acta, envio.entrada)] += 1;
  const datos = ordenEstados.map((estado) => ({
    etiqueta: estadosEnvio[estado].plural, cantidad: cantidades[estado],
    icono: estadosEnvio[estado].icono, tono: estadosEnvio[estado].tono,
  }));
  const avance = envios.length ? cantidades.enviada / envios.length : 0;

  return (
    <Marco cabecera={<CabeceraSincronizacion mesa={mesa} />}>
      <View style={estilos.volver}><Enlace href="/veedor" texto="Volver al inicio" icono="atras" centrado reemplazar /></View>
      <Aviso mensaje={{ tipo: 'info', texto: 'Las actas confirmadas se guardan en este dispositivo y se envían automáticamente cuando vuelve la conexión.' }} />
      <Aviso mensaje={mensaje} />
      <EstadoConsulta consulta={consulta} ilustracionCarga={<AnimacionCarga />}>
        <Tarjeta titulo="Resumen de envíos" icono="sincronizacion">
          <ResumenGestion datos={datos} dosColumnas />
          <Text style={estilos.detalle}>
            La cola reúne los envíos pendientes, en curso y con errores. Los envíos resueltos corresponden a la última mesa descargada.
          </Text>
        </Tarjeta>
        {envios.length > 0 && (
          <Tarjeta titulo="Avance de sincronización" icono="seguimiento">
            <View style={estilos.avance}>
              <Text style={estilos.avanceCifra}>{formatoPorcentaje.format(avance)}</Text>
              <View style={estilos.pista} accessibilityRole="progressbar" accessibilityLabel="Actas sincronizadas"
                accessibilityValue={{ min: 0, max: 100, now: Math.round(avance * 100) }}>
                <Animated.View layout={movimiento} style={[estilos.relleno, { width: `${avance * 100}%` }]} />
              </View>
              <Text style={estilos.detalle}>{cantidades.enviada} de {envios.length} actas visibles sincronizadas</Text>
            </View>
          </Tarjeta>
        )}
        <Tarjeta titulo="Actas locales" icono="actas">
          {!entradas.length && <Texto>No hay actas pendientes de envío en este dispositivo.</Texto>}
          {envios.map((envio) => (
            <DetalleEnvio key={envio.acta.id} envio={envio} mesa={mesa} conectado={conectado} reintentar={reintentar} />
          ))}
        </Tarjeta>
      </EstadoConsulta>
    </Marco>
  );
}

const estilos = StyleSheet.create({
  portada: { backgroundColor: '#05173A' },
  columna: { width: '100%', maxWidth: 620, alignSelf: 'center', paddingHorizontal: 16 },
  portadaContenido: { paddingTop: 13, paddingBottom: 35, gap: 62 },
  barra: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  marca: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  marcaNombre: { flexShrink: 1 },
  control: { color: colores.blanco, fontSize: 17, fontWeight: '900' },
  portadaTextos: { gap: 9, marginBottom: 3 },
  titular: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  titulo: {
    flex: 1, color: colores.blanco, fontSize: 29, fontWeight: '900',
    textShadowColor: '#05173A', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6,
  },
  jurisdiccion: {
    flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 5,
    maxWidth: '100%', backgroundColor: '#122F60', borderWidth: 1, borderColor: '#ACC0E5',
    borderRadius: 14, paddingVertical: 6, paddingHorizontal: 9,
  },
  jurisdiccionTexto: { color: colores.blanco, fontSize: 15, fontWeight: '800', flexShrink: 1 },
  onda: { height: 32, justifyContent: 'flex-end', overflow: 'hidden', position: 'absolute', bottom: 0, left: 0, right: 0 },
  volver: { alignSelf: 'flex-start', backgroundColor: colores.azulSuave, borderRadius: 13 },
  avance: { gap: 7, padding: 11, borderRadius: 12, backgroundColor: '#E7F2FF' },
  avanceCifra: { color: colores.azul, fontSize: 25, fontWeight: '900', fontVariant: ['tabular-nums'] },
  pista: { height: 12, borderRadius: 9, backgroundColor: '#C8DAF3', overflow: 'hidden' },
  relleno: { height: '100%', borderRadius: 9, backgroundColor: colores.exito },
  metadatos: { gap: 7, backgroundColor: '#EEF4FF', borderRadius: 10, padding: 9 },
  metadato: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detalle: { color: colores.secundario, fontSize: 15, lineHeight: 21, flexShrink: 1 },
});
