import PantallaInicioRol from '@/modulos/acceso/presentacion/pantalla-inicio-rol';
import { AccesoRapido } from '@/modulos/operacion/presentacion/componentes';

export default function InicioRecinto() {
  return (
    <PantallaInicioRol rol="recinto">
      <AccesoRapido href="/mesas-recinto" titulo="Mesas y asignaciones" detalle="Veeduría vigente e historial por mesa" icono="mesa" />
      <AccesoRapido href="/veedores-recinto" titulo="Veedores del recinto" detalle="Altas, habilitación y recuperación asistida" icono="cuentas" />
    </PantallaInicioRol>
  );
}
