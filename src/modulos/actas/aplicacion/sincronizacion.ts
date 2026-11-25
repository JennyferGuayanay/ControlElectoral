import type { ActaConfirmada, ResultadoRegistro } from '../dominio/acta';
import { demoraReintento, FalloEnvio, type EstadoCola, type MotivoEnvio } from '../dominio/sincronizacion';

export type EntradaCola = {
  acta: ActaConfirmada;
  estado: EstadoCola;
  motivo: MotivoEnvio | null;
  proximo: number | null;
};
type Clave = { id: string; autorId: string };

export interface AlmacenCola {
  cola(autorId: string): Promise<EntradaCola[]>;
  tomar(acta: Clave, reserva: string, ahora: number): Promise<number | null>;
  resolver(acta: Clave, reserva: string, estado: 'enviada' | 'conflicto'): Promise<void>;
  devolver(acta: Clave, reserva: string, motivo: MotivoEnvio | null, proximo: number | null): Promise<void>;
  adelantar(acta: Clave): Promise<void>;
  reactivarRed(autorId: string): Promise<void>;
}

type Cambio = { autorId: string; registroRemoto?: boolean };
type Condiciones = { autorId: string | null; disponible: boolean };

export function crearSincronizador({
  local, registrar, nuevoId, reportar, ahora = Date.now,
}: {
  local: AlmacenCola;
  registrar(acta: ActaConfirmada, signal: AbortSignal): Promise<ResultadoRegistro>;
  nuevoId(): string;
  reportar(motivo: MotivoEnvio | 'cola'): void;
  ahora?(): number;
}) {
  const observadores = new Set<(cambio: Cambio) => void>();
  let condiciones: Condiciones = { autorId: null, disponible: false };
  let generacion = 0;
  let ejecucion: Promise<void> | undefined;
  let cancelarEnvio: AbortController | undefined;
  let reloj: ReturnType<typeof setTimeout> | undefined;
  let volver = false;

  function publicar(cambio: Cambio) {
    for (const observador of observadores) observador(cambio);
  }

  function sigueVigente(autorId: string, version: number) {
    return condiciones.disponible && condiciones.autorId === autorId && generacion === version;
  }

  async function enviar(acta: ActaConfirmada, version: number) {
    const { autorId } = acta;
    const reserva = nuevoId();
    const intento = await local.tomar(acta, reserva, ahora());
    if (intento === null) return;
    publicar({ autorId });

    if (!sigueVigente(autorId, version)) {
      await local.devolver(acta, reserva, null, 0);
      publicar({ autorId });
      return;
    }

    const control = new AbortController();
    cancelarEnvio = control;
    const limite = setTimeout(() => control.abort(), 45_000);
    let rechazarCancelacion: (() => void) | undefined;
    try {
      const cancelacion = new Promise<never>((_, rechazar) => {
        rechazarCancelacion = () => rechazar(new FalloEnvio('red'));
        control.signal.addEventListener('abort', rechazarCancelacion);
      });
      const resultado = await Promise.race([registrar(acta, control.signal), cancelacion]);
      await local.resolver(acta, reserva, resultado === 'conflicto' ? 'conflicto' : 'enviada');
      publicar({ autorId, registroRemoto: true });
    } catch (error) {
      if (!sigueVigente(autorId, version)) {
        await local.devolver(acta, reserva, null, 0);
      } else {
        const motivo = control.signal.aborted ? 'red' : error instanceof FalloEnvio ? error.motivo : 'servidor';
        const proximo = motivo === 'red' || motivo === 'servidor' ? ahora() + demoraReintento(intento) : null;
        await local.devolver(acta, reserva, motivo, proximo);
        reportar(motivo);
      }
      publicar({ autorId });
    } finally {
      clearTimeout(limite);
      if (rechazarCancelacion) control.signal.removeEventListener('abort', rechazarCancelacion);
      cancelarEnvio = undefined;
    }
  }

  async function recorrer(autorId: string, version: number) {
    for (const entrada of await local.cola(autorId)) {
      if (!sigueVigente(autorId, version)) return;
      if (entrada.proximo !== null && entrada.proximo <= ahora()) {
        await enviar(entrada.acta, version);
      }
    }
    const pendientes = await local.cola(autorId);
    if (!sigueVigente(autorId, version)) return;

    const siguiente = pendientes.reduce((minimo, entrada) => (
      entrada.proximo !== null ? Math.min(minimo, entrada.proximo) : minimo
    ), Infinity);
    if (Number.isFinite(siguiente)) reloj = setTimeout(solicitar, Math.max(0, siguiente - ahora()));
  }

  function solicitar() {
    clearTimeout(reloj);
    reloj = undefined;
    const { autorId, disponible } = condiciones;
    if (!autorId || !disponible) return;
    if (ejecucion) { volver = true; return; }

    ejecucion = recorrer(autorId, generacion).catch(() => {
      reportar('cola');
      if (condiciones.autorId === autorId && condiciones.disponible) reloj = setTimeout(solicitar, 5_000);
    }).finally(() => {
      ejecucion = undefined;
      if (volver) { volver = false; solicitar(); }
    });
  }

  return {
    consultar: (autorId: string) => local.cola(autorId),
    configurar(siguiente: Condiciones) {
      if (condiciones.autorId === siguiente.autorId && condiciones.disponible === siguiente.disponible) return;
      condiciones = siguiente;
      generacion += 1;
      cancelarEnvio?.abort();
      solicitar();
      const { autorId, disponible } = siguiente;
      if (autorId && disponible) {
        void local.reactivarRed(autorId).then(() => {
          if (condiciones.autorId === autorId) solicitar();
        }).catch(() => reportar('cola'));
      }
    },
    confirmarEnCola(autorId: string) {
      publicar({ autorId });
      if (condiciones.autorId === autorId) solicitar();
    },
    suscribir(observador: (cambio: Cambio) => void) {
      observadores.add(observador);
      return () => { observadores.delete(observador); };
    },
    async reintentar(acta: Clave) {
      if (condiciones.autorId !== acta.autorId) throw new FalloEnvio('permisos');
      await local.adelantar(acta);
      publicar({ autorId: acta.autorId });
      solicitar();
    },
  };
}

export type SincronizadorActas = ReturnType<typeof crearSincronizador>;
