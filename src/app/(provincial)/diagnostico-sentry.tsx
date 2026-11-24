import {
  permiteFalloNativo, probarFalloNativo, reportarFallo,
} from '@/modulos/monitoreo/infraestructura/sentry';
import { PantallaDiagnostico } from '@/modulos/monitoreo/presentacion/pantalla-diagnostico';

export default function DiagnosticoSentry() {
  return (
    <PantallaDiagnostico
      reportarFallo={reportarFallo}
      falloNativo={permiteFalloNativo ? probarFalloNativo : undefined}
    />
  );
}
