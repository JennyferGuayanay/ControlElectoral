import type { AlmacenActas } from '../aplicacion/actas';
import type { AlmacenCola, EntradaCola } from '../aplicacion/sincronizacion';
import { esquemaContexto, esquemaRegistroLocal, type RegistroLocal } from '../dominio/acta';
import { puedeReintentar } from '../dominio/sincronizacion';

function guardado(clave: string) {
  const texto = window.sessionStorage.getItem(clave);
  return texto ? JSON.parse(texto) as unknown : null;
}
function guardar(clave: string, datos: unknown) {
  window.sessionStorage.setItem(clave, JSON.stringify(datos));
}
const claveActas = (autor: string) => `actas-electorales.${autor}`;
const claveContexto = (autor: string) => `actas-electorales.contexto.${autor}`;
const claveCola = (autor: string) => `actas-electorales.cola.${autor}`;
const registros = (autor: string) => esquemaRegistroLocal.array().parse(guardado(claveActas(autor)) ?? []);
function buscar(actas: RegistroLocal[], acta: RegistroLocal) {
  return actas.findIndex(({ mesaId, dignidad }) => mesaId === acta.mesaId && dignidad === acta.dignidad);
}
async function actualizar(desde: RegistroLocal) {
  const actas = registros(desde.autorId);
  const posicion = buscar(actas, desde);
  if (actas[posicion]?.estado !== 'borrador' || actas[posicion].id !== desde.id) {
    throw new Error('Esta acta ya está confirmada. Vuelve a abrirla para consultar su estado.');
  }
  actas[posicion] = desde;
  guardar(claveActas(desde.autorId), actas);
}

type DatosCola = Omit<EntradaCola, 'acta'> & { intentos: number; reserva: string | null };
const autoresRecuperados = new Set<string>();
const pendiente: DatosCola = { estado: 'pendiente', motivo: null, proximo: 0, intentos: 0, reserva: null };

function datosCola(autor: string) {
  const cola = (guardado(claveCola(autor)) ?? {}) as Record<string, DatosCola>;
  if (!autoresRecuperados.has(autor)) {
    for (const dato of Object.values(cola)) {
      if (dato.estado === 'sincronizando') Object.assign(dato, { ...pendiente, intentos: dato.intentos });
    }
    guardar(claveCola(autor), cola);
    autoresRecuperados.add(autor);
  }
  return cola;
}

export const almacenActas: AlmacenActas & AlmacenCola = {
  async contexto(autorId) { return esquemaContexto.nullable().parse(guardado(claveContexto(autorId))); },
  async guardarContexto(autorId, contexto) { guardar(claveContexto(autorId), contexto); },
  async listar({ autorId, mesaId }) { return registros(autorId).filter((registro) => registro.mesaId === mesaId); },
  async abrir(borrador) {
    const actas = registros(borrador.autorId);
    const posicion = buscar(actas, borrador);
    if (posicion >= 0) return actas[posicion];
    guardar(claveActas(borrador.autorId), [...actas, borrador]);
    return borrador;
  },
  actualizar,
  confirmar: actualizar,
  async cola(autorId) {
    const cola = datosCola(autorId);
    return registros(autorId).flatMap((acta) => {
      if (acta.estado !== 'pendiente') return [];
      const { estado, motivo, proximo } = cola[acta.id] ?? pendiente;
      return [{ acta, estado, motivo, proximo }];
    });
  },
  async tomar({ id, autorId }, reserva, ahora) {
    if (!registros(autorId).some((acta) => acta.id === id && acta.estado === 'pendiente')) return null;
    const cola = datosCola(autorId);
    const dato = cola[id] ?? pendiente;
    if (dato.proximo === null || dato.proximo > ahora) return null;
    cola[id] = { estado: 'sincronizando', motivo: null, proximo: ahora + 90_000, intentos: dato.intentos + 1, reserva };
    guardar(claveCola(autorId), cola);
    return cola[id].intentos;
  },
  async resolver({ id, autorId }, reserva, estado) {
    const cola = datosCola(autorId);
    if (cola[id]?.reserva !== reserva) return;
    const actas = registros(autorId).map((acta) => acta.id === id && acta.estado === 'pendiente' ? { ...acta, estado } : acta);
    guardar(claveActas(autorId), actas);
    delete cola[id];
    guardar(claveCola(autorId), cola);
  },
  async devolver({ id, autorId }, reserva, motivo, proximo) {
    const cola = datosCola(autorId);
    if (cola[id]?.reserva !== reserva) return;
    cola[id] = { ...cola[id], estado: motivo ? 'error' : 'pendiente', motivo, proximo, reserva: null };
    guardar(claveCola(autorId), cola);
  },
  async adelantar({ id, autorId }) {
    const cola = datosCola(autorId);
    const entrada = cola[id];
    if (!entrada || entrada.estado === 'sincronizando' || !puedeReintentar(entrada.motivo)) return;
    cola[id] = { ...pendiente, intentos: entrada.intentos };
    guardar(claveCola(autorId), cola);
  },
  async reactivarRed(autorId) {
    const cola = datosCola(autorId);
    for (const entrada of Object.values(cola)) {
      if (entrada.estado === 'error' && entrada.motivo === 'red') entrada.proximo = 0;
    }
    guardar(claveCola(autorId), cola);
  },
};
