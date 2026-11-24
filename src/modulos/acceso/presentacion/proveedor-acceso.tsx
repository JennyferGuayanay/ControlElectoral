import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';

import type { ReportarFallo } from '@/modulos/monitoreo/aplicacion/monitoreo';

import { resolverAcceso, type RepositorioAcceso, type Sesion } from '../aplicacion/acceso';
import type { EstadoAutenticado } from '../dominio/acceso';

type EstadoFinal = EstadoAutenticado | { tipo: 'error'; mensaje: string };
type EstadoAcceso = EstadoFinal | { tipo: 'cargando' } | { tipo: 'sin-sesion' };

type ContextoAcceso = {
  repositorio: RepositorioAcceso;
  estado: EstadoAcceso;
  sesion: Sesion | null;
  claveActualizada: boolean;
  revisar(): void;
  confirmarCambio(): void;
};

const Contexto = createContext<ContextoAcceso | null>(null);

export function ProveedorAcceso({
  children, repositorio, reportarFallo,
}: PropsWithChildren<{ repositorio: RepositorioAcceso; reportarFallo: ReportarFallo }>) {
  const [sesion, fijarSesion] = useState<Sesion | null>();
  const [revision, fijarRevision] = useState(0);
  const [resultado, fijarResultado] = useState<{ usuarioId: string; estado: EstadoFinal }>();
  const [errorInicial, fijarErrorInicial] = useState(false);
  const [claveActualizada, fijarClaveActualizada] = useState(false);

  useEffect(() => {
    let vigente = true;
    let cancelar: (() => void) | undefined;

    try {
      cancelar = repositorio.observarSesion((nueva) => {
        fijarSesion(nueva);
        if (!nueva) {
          fijarResultado(undefined);
          fijarClaveActualizada(false);
        }
      });
    } catch (error) {
      reportarFallo('restaurar-sesion', error);
      queueMicrotask(() => {
        if (vigente) fijarErrorInicial(true);
      });
    }

    return () => {
      vigente = false;
      cancelar?.();
    };
  }, [repositorio, reportarFallo]);

  useEffect(() => {
    const suscripcion = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') fijarRevision((anterior) => anterior + 1);
    });
    return () => suscripcion.remove();
  }, []);

  useEffect(() => {
    if (!sesion) return;
    let vigente = true;

    void resolverAcceso(repositorio, sesion)
      .then((estado) => {
        if (vigente) fijarResultado({ estado, usuarioId: sesion.usuarioId });
      })
      .catch((error: unknown) => {
        if (vigente) {
          reportarFallo('comprobar-acceso', error);
          fijarResultado({
            usuarioId: sesion.usuarioId,
            estado: { tipo: 'error', mensaje: 'No pudimos comprobar tu acceso. Revisa la conexión e inténtalo de nuevo.' },
          });
        }
      });

    return () => {
      vigente = false;
    };
  }, [repositorio, reportarFallo, sesion, revision]);

  function revisar() {
    fijarRevision((anterior) => anterior + 1);
  }

  function confirmarCambio() {
    fijarClaveActualizada(true);
    revisar();
  }

  let estado: EstadoAcceso = { tipo: 'cargando' };
  if (errorInicial) {
    estado = { tipo: 'error', mensaje: 'No hay conexión configurada con el servidor de acceso.' };
  } else if (sesion === null) {
    estado = { tipo: 'sin-sesion' };
  } else if (sesion && resultado?.usuarioId === sesion.usuarioId) {
    estado = resultado.estado;
  }

  return (
    <Contexto.Provider value={{ repositorio, estado, sesion: sesion ?? null, revisar, confirmarCambio, claveActualizada }}>
      {children}
    </Contexto.Provider>
  );
}

export function useAcceso() {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('Falta el proveedor de acceso.');
  return contexto;
}
