import { Enlace } from '@/modulos/acceso/presentacion/interfaz';
import PantallaInicioRol from '@/modulos/acceso/presentacion/pantalla-inicio-rol';
import { pruebaSentryHabilitada } from '@/modulos/monitoreo/infraestructura/sentry';
import { AccesoRapido } from '@/modulos/operacion/presentacion/componentes';

export default function InicioProvincial() {
  return (
    <PantallaInicioRol rol="provincial"
      opcionesSecundarias={pruebaSentryHabilitada && (
        <Enlace href="/diagnostico-sentry" texto="Diagnóstico de Sentry" icono="info" centrado />
      )}>
      <AccesoRapido href="/territorio" titulo="Territorio electoral" detalle="Parroquias, recintos y mesas" icono="territorio" tono="amarillo" />
      <AccesoRapido href="/cuentas-provinciales" titulo="Gestión de cuentas" detalle="Coordinadores y veedores" icono="cuentas" tono="azul" />
      <AccesoRapido href="/seguimiento" titulo="Seguimiento electoral" detalle="Avance y resultados preliminares" icono="seguimiento" tono="rojo" />
      <AccesoRapido href="/coordinaciones" titulo="Coordinación de recintos" detalle="Responsables e historial" icono="coordinacion" tono="blanco" />
    </PantallaInicioRol>
  );
}
