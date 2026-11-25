import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Link, type Href } from 'expo-router';
import { useState, type ComponentProps, type PropsWithChildren, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';

import { FranjaTricolor, IconoElectoral, LogotipoElectoral, OndaTricolor, PaisajeElectoral, type NombreIcono } from '@/compartido/presentacion/graficos-electorales';
import IndicadorConexion from '@/modulos/acceso/presentacion/indicador-conexion';
import { Aviso, Boton, Campo, colores, Encabezado, Enlace, Marco, Panel } from '@/modulos/acceso/presentacion/interfaz';
import { useAcceso } from '@/modulos/acceso/presentacion/proveedor-acceso';

import { coincideBusqueda, nombreCompleto, rotuloMesa, type Mesa, type Recinto, type Vigencia } from '../dominio/operacion';

const tonosTarjeta = {
  amarillo: { fondo: '#FFD015', borde: '#FFE877', texto: colores.azul, icono: '#FFF2A3', flecha: '#856200' },
  azul: { fondo: '#0843A6', borde: '#64A7FF', texto: colores.blanco, icono: '#1C5CC1', flecha: '#2268C0' },
  rojo: { fondo: '#BE1433', borde: '#FF7285', texto: colores.blanco, icono: '#C92B48', flecha: '#A90D2C' },
  blanco: { fondo: '#F1F6FF', borde: '#FFFFFF', texto: colores.azul, icono: '#DBE9FF', flecha: '#49658D' },
};

const tonosEstado = {
  positivo: { fondo: '#E2F5E8', texto: '#155B39', borde: '#9BCFAE' },
  negativo: { fondo: '#FFE9EC', texto: '#912442', borde: '#EDB6C3' },
  alerta: { fondo: '#FFF2C4', texto: '#6D4800', borde: '#E6C46A' },
  neutro: { fondo: '#E7EEFA', texto: '#274771', borde: '#BECFE7' },
  enCurso: { fondo: '#DCEAFF', texto: '#0B49A4', borde: '#86B1EF' },
  conflicto: { fondo: '#FFF0DF', texto: '#8C390D', borde: '#EAB287' },
};

const entrada = FadeInDown.duration(200).reduceMotion(ReduceMotion.System);

function useClaveOperacion() {
  const { estado } = useAcceso();
  const usuario = estado.tipo === 'habilitado' ? estado.perfil.usuario_id : null;
  return ['operacion', usuario] as const;
}

export function useConsulta<T>(clave: readonly (string | number)[], obtener: () => Promise<T>) {
  const base = useClaveOperacion();
  return useQuery({ queryKey: [...base, ...clave], queryFn: obtener, enabled: base[1] !== null, gcTime: 0, retry: 1 });
}

export function useActualizar() {
  const cliente = useQueryClient();
  const clave = useClaveOperacion();
  return () => cliente.invalidateQueries({ queryKey: clave });
}

export function AccesoRapido({
  href, titulo, detalle, icono, tono,
}: { href: Href; titulo: string; detalle: string; icono: NombreIcono; tono: keyof typeof tonosTarjeta }) {
  const paleta = tonosTarjeta[tono];

  return (
    <Link href={href} asChild>
      <Pressable accessibilityRole="link" accessibilityLabel={titulo} accessibilityHint={detalle}
        style={estilos.acceso}>
        {({ pressed }) => (
          <View style={[estilos.tarjetaAcceso, { backgroundColor: paleta.fondo, borderColor: paleta.borde },
            pressed && estilos.presionado]}>
            <Image source={require('../../../../assets/electoral/reflejo-tarjeta-menu.png')} contentFit="fill"
              style={estilos.reflejo} accessible={false} />
            <View style={[estilos.icono, { backgroundColor: paleta.icono }]}>
              <IconoElectoral nombre={icono} tamano={33} color={paleta.texto} />
            </View>
            <Text style={[estilos.tituloAcceso, { color: paleta.texto }]}>{titulo}</Text>
            <View style={estilos.detalleAcceso}>
              <Text style={[estilos.descripcionAcceso, { color: paleta.texto }]}>{detalle}</Text>
              <View style={[estilos.flechaAcceso, { backgroundColor: paleta.flecha }]}>
                <IconoElectoral nombre="siguiente" tamano={17} color={colores.blanco} />
              </View>
            </View>
          </View>
        )}
      </Pressable>
    </Link>
  );
}

export function Pantalla({
  titulo, detalle, inicio, etiquetaVolver = 'Volver al inicio', iconoGestion, children,
}: PropsWithChildren<{ titulo: string; detalle?: string; inicio: Href; etiquetaVolver?: string; iconoGestion?: NombreIcono }>) {
  if (iconoGestion) {
    return (
      <Marco cabecera={
        <View style={estilos.portadaGestion}>
          <PaisajeElectoral cabecera />
          <View style={estilos.contenidoGestion}>
            <View style={estilos.marcaGestion}>
              <View style={estilos.filaGestion}>
                <LogotipoElectoral />
                <View style={estilos.marcaNombre}>
                  <Text style={estilos.marcaTexto}>Control Electoral</Text>
                  <FranjaTricolor estrecha />
                </View>
              </View>
              <IndicadorConexion cabecera />
            </View>
            <Animated.View entering={entrada} style={estilos.cabeceraGestion}>
              <IconoElectoral nombre={iconoGestion} tamano={33} color={colores.amarillo} />
              <View style={estilos.cabeceraTextos}>
                <Text accessibilityRole="header" style={estilos.tituloGestion}>{titulo}</Text>
                {detalle && <Text style={estilos.detalleGestion}>{detalle}</Text>}
              </View>
            </Animated.View>
          </View>
          <View pointerEvents="none" style={estilos.ondaGestion}><OndaTricolor posicion="pie" amplia /></View>
        </View>
      }>
        <View style={estilos.volverGestion}><Enlace href={inicio} texto={etiquetaVolver} icono="atras" centrado reemplazar /></View>
        {children}
      </Marco>
    );
  }

  return (
    <Marco>
      <Enlace href={inicio} texto={etiquetaVolver} icono="atras" reemplazar />
      <Encabezado titulo={titulo} detalle={detalle} />
      {children}
    </Marco>
  );
}

export function Texto({ children, destacado }: PropsWithChildren<{ destacado?: boolean }>) {
  return <Text style={destacado ? estilos.titulo : estilos.texto}>{children}</Text>;
}

export function Tarjeta({ titulo, children, icono }: PropsWithChildren<{ titulo: string; icono?: NombreIcono }>) {
  const encabezado = <Text accessibilityRole="header" style={estilos.titulo}>{titulo}</Text>;
  return (
    <Animated.View entering={entrada}>
      <Panel>
        {icono ? (
          <View style={estilos.filaGestion}>
            <View style={estilos.iconoGestion}>
              <IconoElectoral nombre={icono} tamano={26} color={colores.azul} />
            </View>
            {encabezado}
          </View>
        ) : encabezado}
        {children}
      </Panel>
    </Animated.View>
  );
}

export function CampoGestion(props: ComponentProps<typeof Campo>) {
  return <Campo {...props} acceso />;
}

export function EstadoRegistro({ texto, tono }: { texto: string; tono: keyof typeof tonosEstado }) {
  const paleta = tonosEstado[tono];
  return (
    <View style={[estilos.estadoRegistro, { backgroundColor: paleta.fondo, borderColor: paleta.borde }]}>
      <View style={[estilos.puntoEstado, { backgroundColor: paleta.texto }]} accessible={false} />
      <Text style={[estilos.estadoTexto, { color: paleta.texto }]}>{texto}</Text>
    </View>
  );
}

export function ResumenGestion({ datos, dosColumnas }: {
  datos: { etiqueta: string; cantidad: number; icono: NombreIcono; tono: keyof typeof tonosEstado }[];
  dosColumnas?: boolean;
}) {
  return (
    <View style={estilos.resumenGestion}>
      {datos.map(({ etiqueta, cantidad, icono, tono }) => {
        const paleta = tonosEstado[tono];
        return (
          <View key={etiqueta} style={[estilos.indicadorGestion, dosColumnas && estilos.indicadorDoble,
            { backgroundColor: paleta.fondo, borderColor: paleta.borde }]}>
            <IconoElectoral nombre={icono} tamano={dosColumnas ? 31 : 24} color={paleta.texto} />
            <Text style={[estilos.etiquetaGestion, { color: paleta.texto }]}>{etiqueta}</Text>
            <Text style={[estilos.cantidadGestion, { color: paleta.texto }]}>{cantidad}</Text>
          </View>
        );
      })}
    </View>
  );
}

export function EstadoConsulta({
  consulta, ilustracionCarga, children,
}: PropsWithChildren<{
  consulta: { isPending: boolean; isError: boolean; refetch(): unknown }; ilustracionCarga?: ReactNode;
}>) {
  if (consulta.isPending) {
    return (
      <Panel>
        <View style={estilos.espera}>
          {ilustracionCarga ?? <ActivityIndicator color={colores.azul} />}
          <Text accessibilityLiveRegion="polite" style={estilos.texto}>Consultando…</Text>
        </View>
      </Panel>
    );
  }
  if (consulta.isError) {
    return (
      <Panel>
        <Aviso mensaje={{ tipo: 'error', texto: 'No pudimos actualizar los datos. Revisa tu conexión y vuelve a intentar.' }} />
        <Boton titulo="Volver a consultar" variante="secundario" alPulsar={() => { void consulta.refetch(); }} />
      </Panel>
    );
  }
  return children;
}

export function Opciones<T extends string | number>({
  opciones, valor, elegir,
}: { opciones: { id: T; texto: string }[]; valor: T | null; elegir(valor: T): void }) {
  return (
    <View style={estilos.opciones}>
      {opciones.map(({ id, texto }) => (
        <Pressable key={id} accessibilityRole="button" accessibilityState={{ selected: id === valor }}
          style={({ pressed }) => [estilos.opcion, id === valor && estilos.seleccion, pressed && estilos.presionado]}
          onPress={() => elegir(id)}>
          <Text style={[estilos.texto, id === valor && estilos.seleccionTexto]}>{texto}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function Lista<T>({
  datos, clave, mostrar, vacio,
}: { datos: T[]; clave(dato: T): string | number; mostrar(dato: T): ReactNode; vacio: string }) {
  const [limite, fijarLimite] = useState(12);
  if (!datos.length) return <Aviso mensaje={{ tipo: 'info', texto: vacio }} />;
  return (
    <>
      {datos.slice(0, limite).map((dato) => <View key={clave(dato)}>{mostrar(dato)}</View>)}
      {datos.length > limite && (
        <Boton titulo={`Mostrar más (${datos.length - limite})`} variante="secundario" alPulsar={() => fijarLimite(limite + 12)} />
      )}
    </>
  );
}

export function SelectorRecinto({
  recintos, recintoId, elegir,
}: { recintos: Recinto[]; recintoId: number | null; elegir(id: number): void }) {
  const [buscar, fijarBuscar] = useState('');
  const [abierto, fijarAbierto] = useState(false);
  const recinto = recintos.find(({ id }) => id === recintoId);
  const opciones = recintos.filter((dato) => coincideBusqueda(buscar, dato.nombre, dato.zona));
  if (!recintos.length) return <Texto>Aún no tienes recintos disponibles.</Texto>;
  return (
    <>
      <Boton titulo={recinto ? `Recinto: ${recinto.nombre}` : 'Seleccionar recinto'}
        variante="secundario" alPulsar={() => fijarAbierto(!abierto)} />
      {abierto && (
        <>
          <CampoGestion etiqueta="Buscar recinto" value={buscar} onChangeText={fijarBuscar} icono="ubicacion" />
          <Lista datos={opciones} clave={(dato) => dato.id} vacio="No hay recintos con esa búsqueda."
            mostrar={(dato) => (
              <Boton titulo={dato.zona ? `${dato.nombre} · ${dato.zona}` : dato.nombre} variante="secundario"
                alPulsar={() => { elegir(dato.id); fijarAbierto(false); }} />
            )} />
        </>
      )}
    </>
  );
}

export function DetalleMesa({ mesa }: { mesa: Mesa }) {
  return (
    <>
      <Texto destacado>{rotuloMesa(mesa)}</Texto>
      {mesa.es_simulacion && <Texto>Mesa de simulación</Texto>}
    </>
  );
}

export function fechaLocal(fecha: string) {
  return new Date(fecha).toLocaleString('es-EC', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Guayaquil' });
}

export function Historial({ registros }: { registros: Vigencia[] }) {
  return (
    <Lista datos={registros} clave={(dato) => dato.id} vacio="Todavía no hay movimientos registrados."
      mostrar={(dato) => (
        <View style={estilos.vigencia}>
          <Texto destacado>{dato.responsable ? nombreCompleto(dato.responsable) : 'Responsable sin detalle visible'}</Texto>
          <EstadoRegistro texto={dato.hasta ? 'Finalizada' : 'Vigente'} tono={dato.hasta ? 'neutro' : 'positivo'} />
          <Texto>Desde {fechaLocal(dato.desde)}</Texto>
          {dato.hasta && <Texto>Hasta {fechaLocal(dato.hasta)}</Texto>}
        </View>
      )} />
  );
}

const estilos = StyleSheet.create({
  acceso: { flexGrow: 1, borderRadius: 21, boxShadow: '0px 6px 16px rgba(0, 8, 26, 0.40)' },
  tarjetaAcceso: {
    flex: 1, minHeight: 158, padding: 12, gap: 6, borderWidth: 2, borderRadius: 21, overflow: 'hidden',
  },
  reflejo: { position: 'absolute', top: 0, left: 0, right: 0, height: 88 },
  icono: { width: 47, height: 47, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  tituloAcceso: { fontSize: 18, lineHeight: 22, fontWeight: '900' },
  detalleAcceso: { flexGrow: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 5 },
  descripcionAcceso: { flex: 1, fontSize: 15, lineHeight: 19, fontWeight: '600' },
  flechaAcceso: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  titulo: { color: colores.azul, fontSize: 19, fontWeight: '800', flexShrink: 1 },
  texto: { color: colores.secundario, fontSize: 17, lineHeight: 24 },
  espera: { flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 48 },
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  opcion: { minHeight: 48, justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 13,
    borderRadius: 14, borderWidth: 2, borderColor: colores.borde, backgroundColor: colores.blanco },
  seleccion: { backgroundColor: colores.azulBrillante, borderColor: colores.azulBrillante },
  seleccionTexto: { color: colores.blanco, fontWeight: '700' },
  presionado: { opacity: 0.72 },
  vigencia: {
    backgroundColor: '#F4F8FE', borderRadius: 12, borderColor: colores.linea,
    borderWidth: 1, borderLeftWidth: 4, borderLeftColor: colores.azulBrillante, padding: 11, gap: 5,
  },
  portadaGestion: { backgroundColor: colores.azul },
  contenidoGestion: { width: '100%', maxWidth: 620, alignSelf: 'center', padding: 16, paddingBottom: 29, gap: 19 },
  ondaGestion: { height: 23, justifyContent: 'flex-end', overflow: 'hidden', position: 'absolute', bottom: 0, left: 0, right: 0 },
  marcaGestion: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 9 },
  filaGestion: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  marcaNombre: { flexShrink: 1 },
  marcaTexto: { color: colores.blanco, fontSize: 17, fontWeight: '900' },
  cabeceraGestion: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 15, padding: 11, gap: 10,
    borderWidth: 1, borderColor: '#7D9BC8', backgroundColor: 'rgba(5, 23, 58, 0.88)',
  },
  cabeceraTextos: { flex: 1, gap: 4 },
  tituloGestion: { color: colores.blanco, fontSize: 25, fontWeight: '900' },
  detalleGestion: { color: '#E7F0FF', fontSize: 15, lineHeight: 20 },
  volverGestion: { alignSelf: 'flex-start', backgroundColor: colores.azulSuave, borderRadius: 14, paddingHorizontal: 6 },
  iconoGestion: { width: 42, height: 42, borderRadius: 13, backgroundColor: colores.azulSuave, alignItems: 'center', justifyContent: 'center' },
  estadoRegistro: {
    alignSelf: 'flex-start', maxWidth: '100%', flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, borderWidth: 1, gap: 7, paddingHorizontal: 9, paddingVertical: 5,
  },
  puntoEstado: { width: 8, height: 8, borderRadius: 4 },
  estadoTexto: { fontSize: 14, fontWeight: '800', flexShrink: 1 },
  resumenGestion: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  indicadorGestion: {
    flex: 1, minWidth: 102, justifyContent: 'space-between', alignItems: 'center',
    gap: 5, padding: 9, borderRadius: 14, borderWidth: 1,
  },
  indicadorDoble: { flexBasis: '46%', paddingVertical: 12 },
  etiquetaGestion: { fontSize: 15, fontWeight: '800', textAlign: 'center' },
  cantidadGestion: { fontSize: 26, fontWeight: '900', fontVariant: ['tabular-nums'] },
});
