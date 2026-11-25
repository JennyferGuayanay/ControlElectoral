import { useCallback, useEffect, useRef, useState } from 'react';

import type { ServicioActas } from '../aplicacion/actas';
import type { EntradaCola, SincronizadorActas } from '../aplicacion/sincronizacion';
import type { ContextoMesa, RegistroLocal } from '../dominio/acta';

type Lectura = {
  registros: RegistroLocal[];
  cola: EntradaCola[];
  contexto: ContextoMesa | null;
};

export function useEstadoLocalActas(
  servicio: ServicioActas, sincronizador: SincronizadorActas, autorId: string, mesaId?: number,
) {
  const [datos, fijarDatos] = useState<Lectura>();
  const [error, fijarError] = useState(false);
  const revision = useRef(0);

  const recargar = useCallback(() => {
    const version = ++revision.current;
    void (async () => {
      try {
        const [contexto, cola] = await Promise.all([servicio.local.contexto(autorId), sincronizador.consultar(autorId)]);
        const id = mesaId ?? contexto?.mesa.id;
        const registros = id === undefined ? [] : await servicio.local.listar({ autorId, mesaId: id });
        if (revision.current === version) {
          fijarDatos({ contexto, cola, registros });
          fijarError(false);
        }
      } catch {
        if (revision.current === version) fijarError(true);
      }
    })();
  }, [servicio, sincronizador, autorId, mesaId]);

  useEffect(() => {
    recargar();
    const cancelar = sincronizador.suscribir((cambio) => {
      if (cambio.autorId === autorId) recargar();
    });
    return () => { cancelar(); revision.current += 1; };
  }, [autorId, recargar, sincronizador]);

  return { datos, error, recargar, cargando: !datos && !error };
}
