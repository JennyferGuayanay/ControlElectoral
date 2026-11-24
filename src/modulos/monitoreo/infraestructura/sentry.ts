import * as Sentry from '@sentry/react-native';
import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';

import type { Pantalla, ReportarFallo, RolMonitoreo } from '../aplicacion/monitoreo';
import { obtenerIdInstalacion } from './instalacion';
import { filtrarEvento } from './privacidad';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
const defensa = process.env.EXPO_PUBLIC_PRUEBA_SENTRY === 'true';
const esNativo = Platform.OS !== 'web' && !isRunningInExpoGo();

export const pruebaSentryHabilitada = Boolean(dsn) && defensa;
export const permiteFalloNativo = pruebaSentryHabilitada && esNativo;

if (dsn) {
  Sentry.init({
    dsn,
    environment: defensa ? 'defensa' : __DEV__ ? 'desarrollo' : 'produccion',
    enableNative: esNativo,
    enableNativeCrashHandling: esNativo,
    enableNdkScopeSync: esNativo,
    enableNativeNagger: false,
    enableAutoSessionTracking: false,
    sendDefaultPii: false,
    maxBreadcrumbs: 0,
    maxCacheItems: 30,
    attachScreenshot: false,
    attachViewHierarchy: false,
    enableCaptureFailedRequests: false,
    enableLogs: false,
    tracesSampleRate: 0,
    profilesSampleRate: 0,
    beforeBreadcrumb: () => null,
    beforeSend: (evento, indicio) => {
      indicio.attachments = [];
      return filtrarEvento(evento);
    },
    integrations: (integraciones) => integraciones.filter(({ name }) => (
      name !== 'Breadcrumbs' && name !== 'HttpContext'
      && (Platform.OS !== 'web' || name !== 'RewriteFrames')
    )),
  });

  void obtenerIdInstalacion().then((id) => {
    if (id) Sentry.setUser({ id });
  }).catch(() => {
    // El monitoreo también funciona sin identificador de instalación.
  });
}

export function fijarContexto(pantalla: Pantalla, rol: RolMonitoreo) {
  if (!dsn) return;
  Sentry.setTag('pantalla', pantalla);
  Sentry.setTag('rol', rol);
}

export const reportarFallo: ReportarFallo = (operacion, error) => {
  if (!dsn) return undefined;
  return Sentry.captureException(error, { tags: { operacion }, level: 'error' });
};

export function probarFalloNativo() {
  if (permiteFalloNativo) Sentry.nativeCrash();
}

export const LimiteErrores = Sentry.ErrorBoundary;
