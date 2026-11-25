import PantallaInicioRol from '@/modulos/acceso/presentacion/pantalla-inicio-rol';
import { AccesoRapido } from '@/modulos/operacion/presentacion/componentes';

export default function InicioVeedor() {
  return (
    <PantallaInicioRol rol="veedor">
      <AccesoRapido href="/mi-asignacion" titulo="Mi mesa asignada" detalle="Ubicación y datos de tu mesa" icono="ubicacion" tono="amarillo" />
      <AccesoRapido href={{ pathname: '/actas', params: { dignidad: 'alcaldia' } }}
        titulo="Acta de Alcaldía" detalle="Registra o consulta los votos" icono="actas" tono="azul" />
      <AccesoRapido href={{ pathname: '/actas', params: { dignidad: 'prefectura' } }}
        titulo="Acta de Prefectura" detalle="Registra o consulta los votos" icono="urna" tono="rojo" />
      <AccesoRapido href={{ pathname: '/actas', params: { seccion: 'sincronizacion' } }}
        titulo="Sincronización" detalle="Consulta el estado de tus envíos" icono="sincronizacion" tono="blanco" />
    </PantallaInicioRol>
  );
}
