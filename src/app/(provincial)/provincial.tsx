import { Enlace } from '@/modulos/acceso/presentacion/interfaz';
import PantallaInicioRol from '@/modulos/acceso/presentacion/pantalla-inicio-rol';
import { pruebaSentryHabilitada } from '@/modulos/monitoreo/infraestructura/sentry';

export default function InicioProvincial() {
  return (
    <PantallaInicioRol rol="provincial">
      {pruebaSentryHabilitada && <Enlace href="/diagnostico-sentry" texto="Diagnóstico de Sentry" />}
    </PantallaInicioRol>
  );
}
