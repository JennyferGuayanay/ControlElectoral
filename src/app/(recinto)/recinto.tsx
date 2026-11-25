import PantallaInicioRol from '@/modulos/acceso/presentacion/pantalla-inicio-rol';
import { AccesoRapido } from '@/modulos/operacion/presentacion/componentes';

export default function InicioRecinto() {
  return (
    <PantallaInicioRol rol="recinto">
      <AccesoRapido href="/mesas-recinto" titulo="Mesas y asignaciones" detalle="Veeduría vigente por mesa" icono="mesa" tono="amarillo" />
      <AccesoRapido href={{ pathname: '/mesas-recinto', params: { seccion: 'actas' } }}
        titulo="Consulta de actas" detalle="Revisa las actas del recinto" icono="actas" tono="azul" />
      <AccesoRapido href="/veedores-recinto" titulo="Gestión de veedores"
        detalle="Altas y recuperación de acceso" icono="cuentas" tono="rojo" />
      <AccesoRapido href={{ pathname: '/mesas-recinto', params: { seccion: 'reemplazos' } }}
        titulo="Reemplazos e historial" detalle="Consulta cambios por mesa" icono="coordinacion" tono="blanco" />
    </PantallaInicioRol>
  );
}
