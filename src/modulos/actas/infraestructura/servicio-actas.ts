import { randomUUID } from 'expo-crypto';

import { reportarFallo } from '@/modulos/monitoreo/infraestructura/sentry';

import { crearServicioActas } from '../aplicacion/actas';
import { crearSincronizador } from '../aplicacion/sincronizacion';
import { almacenActas } from './almacen-actas';
import { archivosActas } from './archivos-actas';
import { repositorioActas } from './supabase-actas';

export const sincronizadorActas = crearSincronizador({
  local: almacenActas, nuevoId: randomUUID,
  registrar: (acta, signal) => repositorioActas.registrar(
    acta, () => archivosActas.leer(acta.autorId, acta.foto.archivo), signal,
  ),
  reportar: (motivo) => { reportarFallo('enviar-acta', new Error(`Sincronización de actas: ${motivo}`)); },
});

export const servicioActas = crearServicioActas({
  local: almacenActas, archivos: archivosActas, remoto: repositorioActas,
  nuevoId: randomUUID, fechaActual: () => new Date().toISOString(),
  alConfirmar: sincronizadorActas.confirmarEnCola,
});
