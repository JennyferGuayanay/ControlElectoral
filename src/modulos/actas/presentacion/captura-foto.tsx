import { Aviso } from '@/modulos/acceso/presentacion/interfaz';

import type { UbicacionEvidencia } from '../dominio/acta';

export type CapturaFotoProps = {
  aceptar(uri: string, ubicacion: UbicacionEvidencia): Promise<void>;
};

export function CapturaFoto(_props: CapturaFotoProps) {
  return <Aviso mensaje={{ tipo: 'info', texto: 'Abre la aplicación móvil para tomar la foto del acta y registrar su ubicación.' }} />;
}
