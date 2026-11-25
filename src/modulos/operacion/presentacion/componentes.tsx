import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, type Href } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useState, type PropsWithChildren, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';

import { Aviso, Boton, Campo, colores, Encabezado, Enlace, Marco, Panel } from '@/modulos/acceso/presentacion/interfaz';
import { useAcceso } from '@/modulos/acceso/presentacion/proveedor-acceso';

import { coincideBusqueda, nombreCompleto, rotuloMesa, type Mesa, type Recinto, type Vigencia } from '../dominio/operacion';

export const iconos = {
  territorio: { ios: 'map', android: 'map', web: 'map' },
  seguimiento: { ios: 'chart.bar', android: 'bar_chart', web: 'bar_chart' },
  cuentas: { ios: 'person.2', android: 'groups', web: 'groups' },
  coordinacion: { ios: 'clock.arrow.circlepath', android: 'history', web: 'history' },
  mesa: { ios: 'list.bullet.rectangle', android: 'ballot', web: 'ballot' },
} satisfies Record<string, SymbolViewProps['name']>;

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
  href, titulo, detalle, icono,
}: { href: Href; titulo: string; detalle: string; icono: keyof typeof iconos }) {
  return (
    <Link href={href} asChild>
      <Pressable accessibilityRole="link" accessibilityLabel={titulo}
        style={({ pressed }) => [estilos.acceso, pressed && estilos.presionado]}>
        <View accessible={false} style={estilos.icono}>
          <SymbolView name={iconos[icono]} size={24} tintColor={colores.azul} />
        </View>
        <View style={estilos.contenido}>
          <Texto destacado>{titulo}</Texto>
          <Texto>{detalle}</Texto>
        </View>
        <Text style={estilos.flecha} accessible={false}>›</Text>
      </Pressable>
    </Link>
  );
}

export function Pantalla({
  titulo, detalle, inicio, etiquetaVolver = 'Volver al inicio', children,
}: PropsWithChildren<{ titulo: string; detalle?: string; inicio: Href; etiquetaVolver?: string }>) {
  return (
    <Marco>
      <Enlace href={inicio} texto={etiquetaVolver} reemplazar />
      <Encabezado titulo={titulo} detalle={detalle} />
      {children}
    </Marco>
  );
}

export function Texto({ children, destacado }: PropsWithChildren<{ destacado?: boolean }>) {
  return <Text style={destacado ? estilos.titulo : estilos.texto}>{children}</Text>;
}

export function Tarjeta({ titulo, children }: PropsWithChildren<{ titulo: string }>) {
  return (
    <Animated.View entering={entrada}>
      <Panel>
        <Text accessibilityRole="header" style={estilos.titulo}>{titulo}</Text>
        {children}
      </Panel>
    </Animated.View>
  );
}

export function EstadoConsulta({
  consulta, children,
}: PropsWithChildren<{ consulta: { isPending: boolean; isError: boolean; refetch(): unknown } }>) {
  if (consulta.isPending) {
    return (
      <View style={estilos.espera}>
        <ActivityIndicator color={colores.azul} />
        <Text accessibilityLiveRegion="polite" style={estilos.texto}>Consultando…</Text>
      </View>
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
  if (!datos.length) return <Texto>{vacio}</Texto>;
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
          <Campo etiqueta="Buscar recinto" value={buscar} onChangeText={fijarBuscar} />
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
          <Texto>Desde {fechaLocal(dato.desde)}</Texto>
          <Texto>{dato.hasta ? `Hasta ${fechaLocal(dato.hasta)}` : 'Vigente'}</Texto>
        </View>
      )} />
  );
}

const estilos = StyleSheet.create({
  acceso: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 16, minHeight: 80,
    backgroundColor: colores.blanco, borderRadius: 16, borderWidth: 1, borderColor: colores.linea },
  icono: { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FCEEBF' },
  contenido: { flex: 1, gap: 3 },
  flecha: { color: colores.azul, fontSize: 27 },
  titulo: { color: colores.azul, fontSize: 19, fontWeight: '800' },
  texto: { color: colores.secundario, fontSize: 16, lineHeight: 23 },
  espera: { flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 48 },
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  opcion: { minHeight: 46, justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 13,
    borderRadius: 14, borderWidth: 1, borderColor: colores.borde, backgroundColor: colores.blanco },
  seleccion: { backgroundColor: colores.azul, borderColor: colores.azul },
  seleccionTexto: { color: colores.blanco, fontWeight: '700' },
  presionado: { opacity: 0.72 },
  vigencia: { borderLeftWidth: 3, borderLeftColor: colores.amarillo, paddingVertical: 4, paddingLeft: 12, gap: 3 },
});
