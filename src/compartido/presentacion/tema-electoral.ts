import type { ViewStyle } from 'react-native';

export const colores = {
  amarillo: '#FFD21A',
  amarilloSuave: '#FFF3B8',
  azul: '#07245E',
  azulBrillante: '#0046BB',
  azulSuave: '#E2EEFF',
  rojo: '#DD153A',
  rojoSuave: '#FFF0F2',
  fondo: '#F8FAFF',
  blanco: '#FFFFFF',
  texto: '#07245E',
  secundario: '#405676',
  borde: '#8298BC',
  linea: '#D0DDF1',
  error: '#A3152E',
  exito: '#166040',
};

export const sombraTarjeta: ViewStyle = {
  boxShadow: '0px 4px 14px rgba(7, 36, 94, 0.12)',
};

export const superficieTarjeta: ViewStyle = {
  ...sombraTarjeta,
  backgroundColor: colores.blanco,
  borderColor: colores.linea,
  borderWidth: 1,
  borderRadius: 16,
};

export const superficieDestacada: ViewStyle = {
  ...superficieTarjeta,
  backgroundColor: colores.azul,
  borderColor: colores.azul,
  borderLeftColor: colores.amarillo,
  borderLeftWidth: 6,
  padding: 18,
  gap: 8,
};
