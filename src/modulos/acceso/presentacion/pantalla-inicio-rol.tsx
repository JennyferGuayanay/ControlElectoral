import { useQuery } from '@tanstack/react-query';
import { useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Children, type PropsWithChildren, type ReactNode } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  EscudoElectoral, FranjaTricolor, IconoElectoral, LogotipoElectoral, OndaTricolor, PaisajeElectoral,
} from '@/compartido/presentacion/graficos-electorales';

import type { Rol } from '../dominio/acceso';
import { CierreSesion } from './cierre-sesion';
import IndicadorConexion from './indicador-conexion';
import { Aviso, Boton, colores } from './interfaz';
import { useAcceso } from './proveedor-acceso';

const equipo = {
  provincial: {
    rol: 'Coordinación provincial',
    ambito: 'Provincia a cargo',
    sinAmbito: 'Tu perfil aún no tiene una provincia visible.',
  },
  recinto: {
    rol: 'Coordinación de recinto',
    ambito: 'Recintos a cargo',
    sinAmbito: 'Aún no tienes un recinto asignado. Consulta a la coordinación provincial.',
  },
  veedor: {
    rol: 'Veeduría electoral',
    ambito: 'Mesa asignada',
    sinAmbito: 'Aún no tienes una mesa asignada. Consulta a tu coordinador de recinto.',
  },
} satisfies Record<Rol, {
  rol: string; ambito: string; sinAmbito: string;
}>;

const entrada = FadeInDown.duration(240).reduceMotion(ReduceMotion.System);
const entradaMenu = FadeInDown.duration(280).delay(70).reduceMotion(ReduceMotion.System);

export default function PantallaInicioRol({
  rol, children, opcionesSecundarias,
}: PropsWithChildren<{ rol: Rol; opcionesSecundarias?: ReactNode }>) {
  const { estado, repositorio, claveActualizada } = useAcceso();
  const enfocado = useIsFocused();
  const { width, fontScale } = useWindowDimensions();
  const dosColumnas = width >= 350 && fontScale <= 1.3;
  const perfil = estado.tipo === 'habilitado' && estado.perfil.rol_codigo === rol ? estado.perfil : null;
  const consulta = useQuery({
    queryKey: ['ambito-acceso', perfil?.usuario_id, rol],
    enabled: !!perfil,
    queryFn: () => perfil ? repositorio.consultarAmbito(perfil) : Promise.resolve([]),
    gcTime: 0,
    retry: 1,
  });

  if (!perfil) return null;
  const textos = equipo[rol];

  return (
    <SafeAreaView style={estilos.pantalla}>
      {enfocado && <StatusBar style="light" />}
      <ScrollView contentContainerStyle={estilos.desplazamiento}>
        <View style={estilos.portada}>
          <PaisajeElectoral portada />
          <View style={[estilos.columna, estilos.cabecera]}>
            <View style={estilos.marca}>
              <LogotipoElectoral />
              <View style={estilos.nombreMarca}>
                <Text style={estilos.tituloMarca}>Control Electoral</Text>
                <FranjaTricolor estrecha />
              </View>
            </View>
            <IndicadorConexion cabecera />
          </View>
          <Animated.View entering={entrada} style={[estilos.columna, estilos.resumen]}>
            <View style={estilos.bienvenida}>
              <Text style={estilos.saludo}>Te damos la bienvenida</Text>
              <Text accessibilityRole="header" style={estilos.nombre}>{perfil.nombres} {perfil.apellidos}</Text>
              <View style={estilos.fila}>
                <IconoElectoral nombre="persona" tamano={20} color={colores.amarillo} />
                <Text style={estilos.rol}>{textos.rol}</Text>
              </View>
            </View>
            <View style={estilos.jurisdiccion}>
              <IconoElectoral nombre="ubicacion" tamano={23} color={colores.amarillo} />
              <View style={estilos.datosJurisdiccion}>
                <Text style={estilos.ambito}>{textos.ambito}</Text>
                {consulta.isPending && (
                  <View style={estilos.fila}>
                    <ActivityIndicator color={colores.blanco} />
                    <Text accessibilityLiveRegion="polite" style={estilos.detalle}>Consultando asignación…</Text>
                  </View>
                )}
                {consulta.isError && <Text style={estilos.detalle}>No pudimos consultar tu asignación.</Text>}
                {consulta.data?.length === 0 && <Text style={estilos.detalle}>{textos.sinAmbito}</Text>}
                {consulta.data?.map((dato) => <Text key={dato} style={estilos.dato}>{dato}</Text>)}
              </View>
            </View>
            {consulta.isError && (
              <Boton titulo="Volver a consultar" variante="secundario"
                cargando={consulta.isFetching} alPulsar={() => void consulta.refetch()} />
            )}
          </Animated.View>
        </View>
        <Animated.View entering={entradaMenu} style={[estilos.columna, estilos.contenido]}>
          {claveActualizada && <Aviso mensaje={{ tipo: 'exito', texto: 'Contraseña actualizada. Tu acceso está habilitado.' }} />}
          <View style={[estilos.opciones, dosColumnas && estilos.cuadricula]}>
            {Children.map(children, (opcion) => opcion && (
              <View style={dosColumnas && estilos.celda}>{opcion}</View>
            ))}
          </View>
          {opcionesSecundarias && <View style={estilos.opcionesSecundarias}>{opcionesSecundarias}</View>}
          <View style={estilos.salir}><CierreSesion acceso /></View>
        </Animated.View>
        <View style={estilos.pie}>
          <OndaTricolor posicion="pie" amplia />
          <View style={estilos.escudo}><EscudoElectoral tamano={62} /></View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: '#05173A' },
  desplazamiento: { flexGrow: 1 },
  portada: { minHeight: 280 },
  columna: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingHorizontal: 15 },
  cabecera: {
    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center',
    justifyContent: 'space-between', paddingVertical: 12, columnGap: 12, rowGap: 8,
  },
  marca: { flexDirection: 'row', flexGrow: 1, flexShrink: 1, alignItems: 'center', gap: 8 },
  nombreMarca: { flexShrink: 1, minWidth: 0 },
  tituloMarca: { color: colores.blanco, fontSize: 20, fontWeight: '900' },
  resumen: { flexGrow: 1, justifyContent: 'flex-end', gap: 12, paddingTop: 82, paddingBottom: 15 },
  bienvenida: { borderLeftWidth: 5, borderLeftColor: colores.amarillo, paddingLeft: 12, gap: 2 },
  saludo: { color: colores.azulSuave, fontSize: 16, fontWeight: '700' },
  nombre: {
    color: colores.blanco, fontWeight: '900', fontSize: 32,
    textShadowColor: '#05173A', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6,
  },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rol: { color: colores.blanco, fontWeight: '800', fontSize: 17, flexShrink: 1 },
  jurisdiccion: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 9,
    backgroundColor: '#0D2B56', borderColor: '#9CB7DF', borderWidth: 1.5, borderRadius: 19,
    paddingHorizontal: 11, paddingVertical: 7, maxWidth: '100%',
  },
  datosJurisdiccion: { flexShrink: 1, gap: 2 },
  ambito: { color: '#CBDCFA', fontSize: 13, fontWeight: '700' },
  detalle: { color: colores.blanco, fontSize: 15, flexShrink: 1 },
  dato: { color: colores.blanco, fontSize: 16, fontWeight: '800' },
  contenido: { flexGrow: 1, gap: 12 },
  opciones: { gap: 11 },
  cuadricula: { flexDirection: 'row', flexWrap: 'wrap' },
  celda: { flexBasis: '47%', flexGrow: 1, minWidth: 0 },
  opcionesSecundarias: { backgroundColor: colores.azulSuave, borderRadius: 18 },
  salir: { marginTop: 'auto', paddingTop: 2 },
  pie: { justifyContent: 'flex-end', minHeight: 79, paddingTop: 16 },
  escudo: {
    position: 'absolute', alignSelf: 'center', bottom: 9, borderWidth: 2,
    borderColor: '#DBE8FF', borderRadius: 34, backgroundColor: colores.blanco,
  },
});
