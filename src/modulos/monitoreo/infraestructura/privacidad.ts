import type { ErrorEvent, StackFrame } from '@sentry/react-native';

import { operaciones, pantallas } from '../aplicacion/monitoreo';

const roles = ['provincial', 'recinto', 'veedor', 'sin-sesion'];
const tipos = ['Error', 'TypeError', 'RangeError', 'ReferenceError', 'SyntaxError', 'URIError', 'AggregateError'];
const mecanismos = ['generic', 'onerror', 'onunhandledrejection', 'auto.function.react.error_boundary'];
const mensajePrueba = 'Sentry test error — diagnóstico de defensa';

function codigo(valor: unknown) {
  return typeof valor === 'string' && /^[a-z0-9_.#@+ -]{1,100}$/i.test(valor) ? valor : undefined;
}

function archivoDeCodigo(ruta?: string) {
  if (!ruta) return undefined;
  const archivo = ruta.split(/[?#]/, 1)[0];
  if (/^(?:app:\/\/\/)?(?:index(?:\.android|\.ios)?\.bundle|main\.jsbundle)$/.test(archivo)) {
    return archivo;
  }
  const web = /\/_expo\/static\/js\/web\/[\w.-]+\.js$/.exec(archivo);
  return web ? `app://${web[0]}` : undefined;
}

function marcoSeguro(marco: StackFrame): StackFrame {
  return {
    filename: archivoDeCodigo(marco.filename),
    abs_path: archivoDeCodigo(marco.abs_path),
    function: marco.function && /^[\w.$<>]{1,100}$/.test(marco.function) ? marco.function : undefined,
    lineno: marco.lineno,
    colno: marco.colno,
    in_app: marco.in_app,
    debug_id: marco.debug_id,
  };
}

export function filtrarEvento(evento: ErrorEvent): ErrorEvent {
  const { app, device, os } = evento.contexts ?? {};
  const pantalla = pantallas.find((valor) => valor === evento.tags?.pantalla);
  const rol = roles.find((valor) => valor === evento.tags?.rol);
  const operacion = operaciones.find((valor) => valor === evento.tags?.operacion);
  const instalacion = evento.user?.id;
  const idPseudonimo = typeof instalacion === 'string'
    && /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(instalacion)
    ? instalacion
    : undefined;

  return {
    type: undefined,
    event_id: evento.event_id,
    timestamp: evento.timestamp,
    level: evento.level,
    platform: evento.platform,
    release: codigo(evento.release),
    dist: codigo(evento.dist),
    environment: codigo(evento.environment),
    message: operacion === 'prueba-defensa' ? mensajePrueba : undefined,
    tags: { pantalla, rol, operacion },
    user: idPseudonimo ? { id: idPseudonimo } : undefined,
    contexts: {
      app: { app_identifier: codigo(app?.app_identifier), app_version: codigo(app?.app_version), app_build: codigo(app?.app_build) },
      device: {
        manufacturer: codigo(device?.manufacturer), brand: codigo(device?.brand),
        model: codigo(device?.model), family: codigo(device?.family), arch: codigo(device?.arch),
      },
      os: { name: codigo(os?.name), version: codigo(os?.version), build: codigo(os?.build) },
    },
    exception: evento.exception && {
      values: evento.exception.values?.map(({ type, mechanism, stacktrace }) => ({
        type: operacion === 'prueba-defensa' ? 'PruebaDefensa' : type && tipos.includes(type) ? type : 'Error',
        value: operacion === 'prueba-defensa'
          ? mensajePrueba
          : operacion ? `Fallo controlado: ${operacion}` : 'Error de la aplicación',
        mechanism: mechanism && {
          type: mecanismos.includes(mechanism.type) ? mechanism.type : 'generic',
          handled: mechanism.handled,
          synthetic: mechanism.synthetic,
          exception_id: mechanism.exception_id,
          parent_id: mechanism.parent_id,
          is_exception_group: mechanism.is_exception_group,
        },
        stacktrace: stacktrace && { frames: stacktrace.frames?.map(marcoSeguro) },
      })),
    },
    debug_meta: {
      images: evento.debug_meta?.images?.flatMap((imagen) => {
        const ruta = archivoDeCodigo(imagen.code_file);
        return imagen.type === 'sourcemap' && ruta
          ? [{ type: 'sourcemap', code_file: ruta, debug_id: imagen.debug_id }]
          : [];
      }),
    },
  };
}
