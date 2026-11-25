import { Texto } from '@/modulos/operacion/presentacion/componentes';

import type { UbicacionEvidencia } from '../dominio/acta';

export function MapaEvidencia(_props: { ubicacion: UbicacionEvidencia }) {
  return <Texto>El mapa interactivo está disponible en la aplicación móvil.</Texto>;
}
