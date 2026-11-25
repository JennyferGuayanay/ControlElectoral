import NetInfo, { useNetInfo } from '@react-native-community/netinfo';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { useAcceso } from '@/modulos/acceso/presentacion/proveedor-acceso';

import { sincronizadorActas } from '../infraestructura/servicio-actas';

export function ActivarSincronizacionActas() {
  const { estado, sesion } = useAcceso();
  const autorId = estado.tipo === 'habilitado' && estado.perfil.rol_codigo === 'veedor'
    ? sesion?.usuarioId ?? null : null;
  const red = useNetInfo();
  const [activa, fijarActiva] = useState(AppState.currentState === 'active' || AppState.currentState === null);
  const consultas = useQueryClient();

  useEffect(() => {
    const observador = AppState.addEventListener('change', (estadoApp) => {
      fijarActiva(estadoApp === 'active');
      if (estadoApp === 'active') void NetInfo.refresh().catch(() => undefined);
    });
    return () => observador.remove();
  }, []);

  useEffect(() => {
    sincronizadorActas.configurar({
      autorId, disponible: activa && red.isConnected === true && red.isInternetReachable !== false,
    });
  }, [activa, autorId, red.isConnected, red.isInternetReachable]);

  useEffect(() => () => sincronizadorActas.configurar({ autorId: null, disponible: false }), []);

  useEffect(() => sincronizadorActas.suscribir((cambio) => {
    if (cambio.registroRemoto && cambio.autorId === autorId) {
      void consultas.invalidateQueries({ queryKey: ['actas', autorId, 'mesa'] });
    }
  }), [autorId, consultas]);

  return null;
}
