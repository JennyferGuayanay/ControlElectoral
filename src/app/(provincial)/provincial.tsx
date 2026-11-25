import { Enlace } from '@/modulos/acceso/presentacion/interfaz';
import PantallaInicioRol from '@/modulos/acceso/presentacion/pantalla-inicio-rol';
import { pruebaSentryHabilitada } from '@/modulos/monitoreo/infraestructura/sentry';
import { AccesoRapido } from '@/modulos/operacion/presentacion/componentes';

export default function InicioProvincial() {
  return (
    <PantallaInicioRol rol="provincial">
      <AccesoRapido href="/seguimiento" titulo="Seguimiento electoral" detalle="Avance y resultados preliminares" icono="seguimiento" />
      <AccesoRapido href="/territorio" titulo="Territorio electoral" detalle="Parroquias, recintos y mesas" icono="territorio" />
      <AccesoRapido href="/cuentas-provinciales" titulo="Gestión de cuentas" detalle="Coordinadores y veedores de la provincia" icono="cuentas" />
      <AccesoRapido href="/coordinaciones" titulo="Coordinación de recintos" detalle="Responsables y períodos de vigencia" icono="coordinacion" />
      {pruebaSentryHabilitada && <Enlace href="/diagnostico-sentry" texto="Diagnóstico de Sentry" />}
    </PantallaInicioRol>
  );
}
