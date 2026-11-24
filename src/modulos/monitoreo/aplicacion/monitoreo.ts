export const pantallas = [
  'inicio', 'ingresar', 'verificar-correo', 'recuperar', 'cambiar-clave',
  'provincial', 'recinto', 'veedor', 'diagnostico-sentry',
] as const;

export const operaciones = [
  'restaurar-sesion', 'comprobar-acceso', 'fotografia-acta', 'enviar-acta', 'prueba-defensa',
] as const;

export type Pantalla = (typeof pantallas)[number];
export type Operacion = (typeof operaciones)[number];
export type RolMonitoreo = 'provincial' | 'recinto' | 'veedor' | 'sin-sesion';

export type ReportarFallo = (operacion: Operacion, error: unknown) => string | undefined;

export function obtenerPantalla(segmento?: string): Pantalla {
  return pantallas.find((pantalla) => pantalla === segmento) ?? 'inicio';
}
