import { z } from 'zod';

export const dignidades = ['alcaldia', 'prefectura'] as const;
export const nombreDignidad = { alcaldia: 'Alcaldía', prefectura: 'Prefectura' };
export const esquemaDignidad = z.enum(dignidades);
export type Dignidad = z.infer<typeof esquemaDignidad>;

const id = z.number().int().positive();
const cantidad = z.number().int().min(0).max(2_147_483_647);
const instante = z.iso.datetime({ offset: true });
export const esquemaMesaElectoral = z.object({
  id, numero: id, numeroJrv: id.nullable(), sexo: z.enum(['F', 'M', 'X']),
  recinto: z.string(), zona: z.string(), parroquia: z.string(), canton: z.string(), provincia: z.string(),
  cantonId: id, provinciaId: id,
});
export const esquemaCandidato = z.object({
  id, orden: z.number().int().min(1).max(5), nombre: z.string(), binomio: z.string().nullable(),
  organizacionId: id, lista: z.string(), organizacion: z.string(),
  color: z.string().regex(/^#[a-f0-9]{6}$/i), simulacion: z.boolean(),
});

export const esquemaContienda = z.object({
  dignidad: esquemaDignidad,
  candidatos: esquemaCandidato.array(),
});
export const esquemaResumen = z.object({ id: z.uuid(), dignidad: esquemaDignidad });
export const esquemaContexto = z.object({
  mesa: esquemaMesaElectoral,
  contiendas: esquemaContienda.array(),
  registradas: esquemaResumen.array(),
});
export type MesaElectoral = z.infer<typeof esquemaMesaElectoral>;
export type Candidato = z.infer<typeof esquemaCandidato>;
export type ContextoMesa = z.infer<typeof esquemaContexto>;

export const esquemaUbicacion = z.object({
  latitud: z.number().min(-90).max(90),
  longitud: z.number().min(-180).max(180),
  precision_metros: z.number().nonnegative().max(Number.MAX_VALUE),
  ubicacion_simulada: z.boolean(),
  capturada_en: instante,
});
export type UbicacionEvidencia = z.infer<typeof esquemaUbicacion>;
export const esquemaFoto = z.object({
  archivo: z.string().regex(/^[a-f0-9-]{36}\.jpg$/),
  ubicacion: esquemaUbicacion,
});
export type FotoEvidencia = z.infer<typeof esquemaFoto>;

export const esquemaValores = z.object({
  numeroActa: z.string(), codigoControl: z.string(),
  sufragantes: z.string(), blancos: z.string(), nulos: z.string(),
  votos: z.array(z.object({ candidatoId: id, cantidad: z.string() })),
});
export type ValoresActa = z.infer<typeof esquemaValores>;

export function leerNumero(texto: string) {
  const limpio = texto.trim();
  if (!/^\d+$/.test(limpio)) return undefined;
  const numero = Number(limpio);
  return cantidad.safeParse(numero).success ? numero : undefined;
}

export function catalogoCompleto(candidatos: Candidato[]) {
  return candidatos.length === 5 && new Set(candidatos.map(({ id }) => id)).size === 5
    && new Set(candidatos.map(({ organizacionId }) => organizacionId)).size === 5
    && new Set(candidatos.map(({ orden }) => orden)).size === 5;
}

export function esquemaFormulario(candidatos: Candidato[]) {
  return esquemaValores.superRefine((valores, contexto) => {
    function error(path: (string | number)[], message: string) {
      contexto.addIssue({ code: 'custom', path, message });
    }
    for (const campo of ['numeroActa', 'codigoControl'] as const) {
      if (valores[campo].trim().length > 80) error([campo], 'Usa un máximo de 80 caracteres.');
    }
    const total = leerNumero(valores.sufragantes);
    if (total === undefined) error(['sufragantes'], 'Escribe un total entero entre 0 y 2147483647.');
    const validar = (texto: string, ubicacion: (string | number)[]) => {
      const voto = leerNumero(texto);
      if (voto === undefined) error(ubicacion, 'Escribe un número entero válido. Usa 0 si no hubo votos.');
      else if (total !== undefined && voto > total) error(ubicacion, 'El valor supera el total de sufragantes.');
      return voto;
    };
    const blancos = validar(valores.blancos, ['blancos']);
    const nulos = validar(valores.nulos, ['nulos']);
    const ids = new Set(candidatos.map((candidato) => candidato.id));
    if (!catalogoCompleto(candidatos) || valores.votos.length !== 5
      || new Set(valores.votos.map((voto) => voto.candidatoId)).size !== 5
      || valores.votos.some((voto) => !ids.has(voto.candidatoId))) {
      error(['votos'], 'Se requieren las cinco candidaturas de esta dignidad.');
    }
    const votos = valores.votos.map((voto, indice) => validar(voto.cantidad, ['votos', indice, 'cantidad']));
    if (total !== undefined && blancos !== undefined && nulos !== undefined
      && votos.every((voto) => voto !== undefined)
      && votos.reduce((suma, voto) => suma + voto, blancos + nulos) !== total) {
      error(['sufragantes'], 'La suma de votos por lista, blancos y nulos debe coincidir con los sufragantes.');
    }
  });
}

export function sumarVotos(valores: ValoresActa) {
  return [valores.blancos, valores.nulos, ...valores.votos.map((voto) => voto.cantidad)]
    .reduce((suma, texto) => suma + (leerNumero(texto) ?? 0), 0);
}

export function prepararValores(candidatos: Candidato[], guardados?: ValoresActa): ValoresActa {
  return {
    numeroActa: guardados?.numeroActa ?? '', codigoControl: guardados?.codigoControl ?? '',
    sufragantes: guardados?.sufragantes ?? '', blancos: guardados?.blancos ?? '', nulos: guardados?.nulos ?? '',
    votos: candidatos.map(({ id }) => ({
      candidatoId: id, cantidad: guardados?.votos.find((voto) => voto.candidatoId === id)?.cantidad ?? '',
    })),
  };
}

export const esquemaEnvio = z.object({
  resultados: z.object({
    total_sufragantes: cantidad, votos_blancos: cantidad, votos_nulos: cantidad,
    numero_acta: z.string().min(1).max(80).nullable(),
    codigo_control: z.string().min(1).max(80).nullable(),
  }),
  votos: z.array(z.object({ candidato_id: id, cantidad })).length(5),
});
export type ResultadosEnvio = z.infer<typeof esquemaEnvio>;

export function prepararEnvio(valores: ValoresActa, candidatos: Candidato[]): ResultadosEnvio {
  const datos = esquemaFormulario(candidatos).parse(valores);
  return esquemaEnvio.parse({
    resultados: {
      total_sufragantes: Number(datos.sufragantes), votos_blancos: Number(datos.blancos), votos_nulos: Number(datos.nulos),
      numero_acta: datos.numeroActa.trim() || null, codigo_control: datos.codigoControl.trim() || null,
    },
    votos: datos.votos.map((voto) => ({ candidato_id: voto.candidatoId, cantidad: Number(voto.cantidad) })),
  });
}

const identidadLocal = z.object({ id: z.uuid(), autorId: z.uuid(), mesaId: id, dignidad: esquemaDignidad });
export const esquemaBorrador = identidadLocal.extend({
  estado: z.literal('borrador'), valores: esquemaValores, foto: esquemaFoto.nullable(),
});
export const esquemaConfirmada = identidadLocal.extend({
  estado: z.enum(['pendiente', 'enviada', 'conflicto']), foto: esquemaFoto,
  confirmadaEn: instante, datos: esquemaEnvio,
});
export const esquemaRegistroLocal = z.union([esquemaBorrador, esquemaConfirmada]);
export type Borrador = z.infer<typeof esquemaBorrador>;
export type ActaConfirmada = z.infer<typeof esquemaConfirmada>;
export type RegistroLocal = z.infer<typeof esquemaRegistroLocal>;
export type ResultadoRegistro = 'registrada' | 'ya_registrada' | 'conflicto';

export function confirmarBorrador(borrador: Borrador, candidatos: Candidato[], fecha: string): ActaConfirmada {
  if (!borrador.foto) throw new Error('Acepta una fotografía con ubicación antes de confirmar.');
  if (Date.parse(borrador.foto.ubicacion.capturada_en) > Date.parse(fecha)) {
    throw new Error('La fecha del dispositivo es anterior a la captura. Revisa la hora e inténtalo de nuevo.');
  }
  const { id, autorId, mesaId, dignidad, foto } = borrador;
  return esquemaConfirmada.parse({
    id, autorId, mesaId, dignidad, foto, estado: 'pendiente', confirmadaEn: fecha,
    datos: prepararEnvio(borrador.valores, candidatos),
  });
}

export function rutaFoto(acta: Pick<ActaConfirmada, 'mesaId' | 'dignidad' | 'id'>) {
  return `${acta.mesaId}/${acta.dignidad}/${acta.id}.jpg`;
}
