import {
  confirmarBorrador, prepararValores, type ActaConfirmada, type Borrador, type Candidato, type ContextoMesa,
  type Dignidad, type RegistroLocal, type ResultadoRegistro, type ResultadosEnvio, type UbicacionEvidencia,
} from '../dominio/acta';

export type AmbitoLocal = { autorId: string; mesaId: number };
export type ActaPublicada = ResultadosEnvio & {
  confirmadaEn: string;
  evidencia: UbicacionEvidencia & { ruta: string };
};

export interface AlmacenActas {
  contexto(autorId: string): Promise<ContextoMesa | null>;
  guardarContexto(autorId: string, contexto: ContextoMesa | null): Promise<void>;
  listar(ambito: AmbitoLocal): Promise<RegistroLocal[]>;
  abrir(borrador: Borrador): Promise<RegistroLocal>;
  actualizar(borrador: Borrador): Promise<void>;
  confirmar(acta: ActaConfirmada): Promise<void>;
}

export interface ArchivosActas {
  guardar(autorId: string, temporal: string): Promise<string>;
  uri(autorId: string, archivo: string): string;
  leer(autorId: string, archivo: string): Promise<ArrayBuffer>;
  eliminar(autorId: string, archivo: string): Promise<void>;
}

export interface RepositorioActas {
  mesaAsignada(autorId: string): Promise<ContextoMesa | null>;
  mesaVisible(mesaId: number): Promise<ContextoMesa | null>;
  actaPublicada(id: string): Promise<ActaPublicada | null>;
  enlaceFoto(ruta: string): Promise<string>;
  registrar(acta: ActaConfirmada, leerFoto: () => Promise<ArrayBuffer>, signal: AbortSignal): Promise<ResultadoRegistro>;
}

export function crearServicioActas(dependencias: {
  local: AlmacenActas; remoto: RepositorioActas; archivos: ArchivosActas;
  nuevoId(): string; fechaActual(): string; alConfirmar(autorId: string): void;
}) {
  const { local, remoto, archivos, nuevoId, fechaActual, alConfirmar } = dependencias;

  return {
    local, remoto, archivos,
    async consultarMesa(autorId: string) {
      const contexto = await remoto.mesaAsignada(autorId);
      await local.guardarContexto(autorId, contexto);
      return contexto;
    },
    abrir(ambito: AmbitoLocal, dignidad: Dignidad, candidatos: Candidato[]) {
      return local.abrir({ ...ambito, dignidad, id: nuevoId(), estado: 'borrador', valores: prepararValores(candidatos), foto: null });
    },
    async aceptarFoto(borrador: Borrador, temporal: string, ubicacion: UbicacionEvidencia) {
      const archivo = await archivos.guardar(borrador.autorId, temporal);
      const siguiente: Borrador = { ...borrador, foto: { archivo, ubicacion } };
      try {
        await local.actualizar(siguiente);
      } catch (error) {
        await archivos.eliminar(borrador.autorId, archivo).catch(() => undefined);
        throw error;
      }
      if (borrador.foto) await archivos.eliminar(borrador.autorId, borrador.foto.archivo).catch(() => undefined);
      return siguiente;
    },
    async confirmar(borrador: Borrador, candidatos: Candidato[]) {
      const acta = confirmarBorrador(borrador, candidatos, fechaActual());
      await local.confirmar(acta);
      alConfirmar(acta.autorId);
      return acta;
    },
  };
}

export type ServicioActas = ReturnType<typeof crearServicioActas>;
