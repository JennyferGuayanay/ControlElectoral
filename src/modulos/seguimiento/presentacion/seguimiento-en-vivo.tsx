import NetInfo, { useNetInfo } from '@react-native-community/netinfo';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';

import type { EstadoCanal, RepositorioSeguimiento } from '../aplicacion/seguimiento';

type Conexion = EstadoCanal | 'sin-conexion';
const Contexto = createContext<Conexion>('conectando');

export const claveDatosSeguimiento = (autor: string) => ['seguimiento', autor, 'datos'] as const;

export function SeguimientoEnVivo({ autor, repositorio, children }: PropsWithChildren<{
  autor: string; repositorio: RepositorioSeguimiento;
}>) {
  const red = useNetInfo();
  const sinConexion = red.isConnected === false || red.isInternetReachable === false;
  const [activa, fijarActiva] = useState(AppState.currentState === 'active' || AppState.currentState === null);
  const [canal, fijarCanal] = useState<EstadoCanal>('conectando');
  const consultas = useQueryClient();

  useEffect(() => {
    const observador = AppState.addEventListener('change', (estado) => {
      fijarActiva(estado === 'active');
      if (estado === 'active') void NetInfo.refresh().catch(() => undefined);
    });
    return () => observador.remove();
  }, []);

  useEffect(() => {
    if (sinConexion || !activa) return;
    let vigente = true;
    let actualizar: ReturnType<typeof setTimeout> | undefined;
    let reintentar: ReturnType<typeof setTimeout> | undefined;
    let cerrar: (() => void) | undefined;
    let revision = 0;

    function refrescar() {
      if (!vigente || actualizar !== undefined) return;
      actualizar = setTimeout(() => {
        actualizar = undefined;
        void consultas.invalidateQueries({ queryKey: claveDatosSeguimiento(autor) });
        void consultas.invalidateQueries({ queryKey: ['operacion', autor, 'actas-mesa'] });
      }, 250);
    }

    function suscribir() {
      if (!vigente) return;
      const intento = ++revision;
      cerrar?.();
      fijarCanal('conectando');
      const cambiarEstado = (estado: EstadoCanal) => {
        if (!vigente || intento !== revision) return;
        fijarCanal(estado);
        if (estado === 'en-vivo') {
          clearTimeout(reintentar);
          reintentar = undefined;
          // Se vuelven a consultar las RPC para incluir las actas que llegaron entre conexiones.
          refrescar();
        } else if (estado === 'interrumpido' && reintentar === undefined) {
          reintentar = setTimeout(() => {
            reintentar = undefined;
            suscribir();
          }, 5_000);
        }
      };
      try {
        cerrar = repositorio.observarActas(refrescar, cambiarEstado);
      } catch {
        cambiarEstado('interrumpido');
      }
    }

    queueMicrotask(() => {
      if (!vigente) return;
      suscribir();
      // El HTTP puede estar disponible antes de que vuelva el WebSocket.
      refrescar();
    });
    return () => {
      vigente = false;
      clearTimeout(actualizar);
      clearTimeout(reintentar);
      cerrar?.();
    };
  }, [activa, autor, consultas, repositorio, sinConexion]);

  return <Contexto.Provider value={sinConexion ? 'sin-conexion' : activa ? canal : 'conectando'}>{children}</Contexto.Provider>;
}

export function useConexionSeguimiento() {
  return useContext(Contexto);
}
