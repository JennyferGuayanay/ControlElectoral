import { useQuery } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';

import type { Rol } from '../dominio/acceso';
import { CierreSesion } from './cierre-sesion';
import { Aviso, Boton, colores, Encabezado, Marco, Panel } from './interfaz';
import { useAcceso } from './proveedor-acceso';

const equipo = {
  provincial: {
    rol: 'Coordinación provincial',
    titulo: 'Control de la provincia',
    ambito: 'Provincia a cargo',
    sinAmbito: 'Tu perfil aún no tiene una provincia visible.',
    descripcion: 'Desde la coordinación provincial se supervisan los recintos y el avance del escrutinio.',
  },
  recinto: {
    rol: 'Coordinación de recinto',
    titulo: 'Operación del recinto',
    ambito: 'Recintos a cargo',
    sinAmbito: 'Aún no tienes un recinto asignado. Consulta a la coordinación provincial.',
    descripcion: 'En tu recinto coordinas las mesas y las asignaciones de veedores.',
  },
  veedor: {
    rol: 'Veeduría electoral',
    titulo: 'Mi mesa electoral',
    ambito: 'Mesa asignada',
    sinAmbito: 'Aún no tienes una mesa asignada. Consulta a tu coordinador de recinto.',
    descripcion: 'En tu mesa se registran las actas de alcaldía y prefectura con la fotografía y la ubicación.',
  },
} satisfies Record<Rol, {
  rol: string; titulo: string; ambito: string; sinAmbito: string; descripcion: string;
}>;

const entrada = FadeInDown.duration(240).reduceMotion(ReduceMotion.System);

export default function PantallaInicioRol({ rol, children }: PropsWithChildren<{ rol: Rol }>) {
  const { estado, repositorio, claveActualizada } = useAcceso();
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
    <Marco>
      <Encabezado titulo={textos.titulo} />
      {claveActualizada && <Aviso mensaje={{ tipo: 'exito', texto: 'Contraseña actualizada. Tu acceso está habilitado.' }} />}
      <Animated.View entering={entrada} style={estilos.credencial}>
        <Text style={estilos.rol}>{textos.rol}</Text>
        <Text style={estilos.nombre}>{perfil.nombres} {perfil.apellidos}</Text>
        <Text style={estilos.correo}>{perfil.correo}</Text>
      </Animated.View>
      <Panel>
        <Text accessibilityRole="header" style={estilos.ambito}>{textos.ambito}</Text>
        {consulta.isPending && (
          <View style={estilos.consultando}>
            <ActivityIndicator color={colores.azul} />
            <Text accessibilityLiveRegion="polite" style={estilos.detalle}>Consultando asignación…</Text>
          </View>
        )}
        {consulta.isError && (
          <>
            <Aviso mensaje={{ tipo: 'error', texto: 'No pudimos consultar tu asignación. Revisa tu conexión.' }} />
            <Boton
              titulo="Volver a consultar"
              variante="secundario"
              cargando={consulta.isFetching}
              alPulsar={() => void consulta.refetch()}
            />
          </>
        )}
        {consulta.data?.length === 0 && <Text style={estilos.detalle}>{textos.sinAmbito}</Text>}
        {consulta.data?.map((dato) => <Text key={dato} style={estilos.dato}>{dato}</Text>)}
        <Text style={estilos.detalle}>{textos.descripcion}</Text>
      </Panel>
      {children}
      <CierreSesion />
    </Marco>
  );
}

const estilos = StyleSheet.create({
  credencial: {
    borderRadius: 15, backgroundColor: colores.azul, borderLeftColor: colores.amarillo,
    borderLeftWidth: 6, padding: 19, gap: 7,
  },
  rol: { color: '#F9D95E', fontWeight: '700', fontSize: 15, letterSpacing: 0.4 },
  nombre: { color: colores.blanco, fontWeight: '800', fontSize: 24 },
  correo: { color: '#E0ECFF', fontSize: 16 },
  ambito: { color: colores.texto, fontSize: 21, fontWeight: '800' },
  detalle: { color: colores.secundario, fontSize: 16, lineHeight: 23, flexShrink: 1 },
  dato: { color: colores.azul, fontSize: 19, fontWeight: '700' },
  consultando: { flexDirection: 'row', alignItems: 'center', gap: 9 },
});
