import PantallaInicioRol from '@/modulos/acceso/presentacion/pantalla-inicio-rol';
import { AccesoRapido } from '@/modulos/operacion/presentacion/componentes';

export default function InicioVeedor() {
  return (
    <PantallaInicioRol rol="veedor">
      <AccesoRapido href="/actas" titulo="Mis actas" detalle="Escrutinio de alcaldía y prefectura" icono="mesa" />
      <AccesoRapido href="/mi-asignacion" titulo="Ver mi asignación" detalle="Ubicación y datos de la mesa a tu cargo" icono="mesa" />
    </PantallaInicioRol>
  );
}
