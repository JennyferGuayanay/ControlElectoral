import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

import { crearSupabaseEnvio, obtenerSupabase } from '@/infraestructura/supabase';

import type { RepositorioActas } from '../aplicacion/actas';
import { esquemaContexto, esquemaDignidad, esquemaEnvio, esquemaResumen, esquemaUbicacion, rutaFoto, type MesaElectoral } from '../dominio/acta';
import { FalloEnvio } from '../dominio/sincronizacion';

const id = z.number().int().positive();
const nombre = z.object({ nombre: z.string() });
const mesa = z.object({
  id, numero: id, numero_jrv_cne: id.nullable(), sexo: z.enum(['F', 'M', 'X']),
  recinto: nombre.extend({
    zona: z.string(),
    parroquia: nombre.extend({
      canton: nombre.extend({ id, provincia: nombre.extend({ id }) }),
    }),
  }),
});
const candidato = nombre.extend({
  id, orden: z.number(), binomio: z.string().nullable(), es_simulacion: z.boolean(),
  organizacion: nombre.extend({ id, codigo: z.string(), color: z.string(), es_simulacion: z.boolean() }),
});
const contienda = z.object({ dignidad_codigo: esquemaDignidad, candidatos: candidato.array() });
const evidencia = esquemaUbicacion.extend({ ruta_foto: z.string().regex(/^[1-9]\d*\/(alcaldia|prefectura)\/[a-f0-9-]{36}\.jpg$/) });
const acta = esquemaEnvio.shape.resultados.extend({
  confirmada_en: z.iso.datetime({ offset: true }),
  votos: esquemaEnvio.shape.votos,
  evidencia,
});
const camposMesa = 'id,numero,numero_jrv_cne,sexo,recinto:recintos(nombre,zona,parroquia:parroquias(nombre,canton:cantones(id,nombre,provincia:provincias(id,nombre))))';
const camposContiendas = 'dignidad_codigo,candidatos(id,orden,nombre,binomio,es_simulacion,organizacion:organizaciones_politicas(id,codigo,nombre,color,es_simulacion))';
const camposActa = 'total_sufragantes,votos_blancos,votos_nulos,numero_acta,codigo_control,confirmada_en,votos(candidato_id,cantidad),evidencia:evidencias(ruta_foto,latitud,longitud,precision_metros,ubicacion_simulada,capturada_en)';
const bucket = 'actas-evidencias';

type Respuesta = { data: unknown; error: { code?: string } | null };
function comprobar({ data, error }: Respuesta) {
  if (error) throw new Error('No pudimos consultar las actas. Revisa la conexión y los permisos de tu cuenta.');
  return data;
}

async function contexto(datos: z.infer<typeof mesa>) {
  const { recinto } = datos;
  const canton = recinto.parroquia.canton;
  const provincia = canton.provincia;
  const territorio: MesaElectoral = {
    id: datos.id, numero: datos.numero, numeroJrv: datos.numero_jrv_cne,
    sexo: datos.sexo, recinto: recinto.nombre, zona: recinto.zona, parroquia: recinto.parroquia.nombre,
    canton: canton.nombre, provincia: provincia.nombre, cantonId: canton.id, provinciaId: provincia.id,
  };
  const cliente = obtenerSupabase();
  const [candidaturas, actasMesa] = await Promise.all([
    cliente.from('contiendas').select(camposContiendas).eq('provincia_id', territorio.provinciaId)
      .or(`canton_id.eq.${territorio.cantonId},canton_id.is.null`),
    cliente.from('actas').select('id,dignidad_codigo').eq('mesa_id', territorio.id),
  ]);
  const filas = contienda.array().parse(comprobar(candidaturas));
  const registradas = esquemaResumen.array().parse(
    z.array(z.object({ id: z.uuid(), dignidad_codigo: esquemaDignidad })).parse(comprobar(actasMesa))
      .map(({ id: actaId, dignidad_codigo }) => ({ id: actaId, dignidad: dignidad_codigo })),
  );
  return esquemaContexto.parse({
    mesa: territorio, registradas,
    contiendas: filas.map((fila) => ({
      dignidad: fila.dignidad_codigo,
      candidatos: fila.candidatos.map((dato) => ({
        id: dato.id, nombre: dato.nombre, orden: dato.orden, binomio: dato.binomio,
        organizacionId: dato.organizacion.id, lista: dato.organizacion.codigo, organizacion: dato.organizacion.nombre,
        color: dato.organizacion.color, simulacion: dato.es_simulacion || dato.organizacion.es_simulacion,
      })).sort((a, b) => a.orden - b.orden),
    })),
  });
}

function falloRemoto(estado?: number, codigo?: string) {
  if (estado === 401 || estado === 403 || codigo === '42501' || codigo === 'PGRST301') return new FalloEnvio('permisos');
  if (estado === 0) return new FalloEnvio('red');
  if (codigo === '22023' || codigo === '23514' || codigo === '23503' || codigo === '22P02') return new FalloEnvio('datos');
  return new FalloEnvio('servidor');
}

async function buscarRegistro(cliente: SupabaseClient, mesaId: number, dignidad: string) {
  const respuesta = await cliente.from('actas').select('id')
    .eq('mesa_id', mesaId).eq('dignidad_codigo', dignidad).maybeSingle();
  if (respuesta.error) throw falloRemoto(respuesta.status, respuesta.error.code);
  return z.object({ id: z.uuid() }).nullable().parse(respuesta.data);
}

export const repositorioActas: RepositorioActas = {
  async mesaAsignada(autorId) {
    const respuesta = await obtenerSupabase().from('asignaciones').select(`mesa:mesas(${camposMesa})`)
      .eq('veedor_id', autorId).is('hasta', null).maybeSingle();
    const asignacion = z.object({ mesa: mesa.nullable() }).nullable().parse(comprobar(respuesta));
    return asignacion?.mesa ? contexto(asignacion.mesa) : null;
  },
  async mesaVisible(mesaId) {
    const respuesta = await obtenerSupabase().from('mesas').select(camposMesa).eq('id', mesaId).maybeSingle();
    const visible = mesa.nullable().parse(comprobar(respuesta));
    return visible ? contexto(visible) : null;
  },
  async actaPublicada(actaId) {
    const respuesta = await obtenerSupabase().from('actas').select(camposActa).eq('id', actaId).maybeSingle();
    const registro = acta.nullable().parse(comprobar(respuesta));
    if (!registro) return null;
    const { votos, confirmada_en, evidencia: foto, ...resultados } = registro;
    const { ruta_foto, ...ubicacion } = foto;
    return { resultados, votos, confirmadaEn: confirmada_en, evidencia: { ...ubicacion, ruta: ruta_foto } };
  },
  async enlaceFoto(ruta) {
    const { data, error } = await obtenerSupabase().storage.from(bucket).createSignedUrl(ruta, 90);
    if (error) throw new Error('No pudimos abrir la fotografía. Verifica tu acceso e inténtalo de nuevo.');
    return data.signedUrl;
  },
  async registrar(registro, leerFoto, signal) {
    if (signal.aborted) throw new FalloEnvio('red');
    const { data: { session }, error: errorSesion } = await obtenerSupabase().auth.getSession();
    if (signal.aborted) throw new FalloEnvio('red');
    if (errorSesion) throw falloRemoto(errorSesion.status, errorSesion.code);
    if (session?.user.id !== registro.autorId) throw new FalloEnvio('permisos');
    const cliente = crearSupabaseEnvio(session.access_token, signal);
    const asignacion = await cliente.from('asignaciones').select('id').eq('veedor_id', registro.autorId)
      .eq('mesa_id', registro.mesaId).is('hasta', null).maybeSingle();
    if (asignacion.error) throw falloRemoto(asignacion.status, asignacion.error.code);
    if (!asignacion.data) throw new FalloEnvio('permisos');

    const anterior = await buscarRegistro(cliente, registro.mesaId, registro.dignidad);
    if (anterior) return anterior.id === registro.id ? 'ya_registrada' : 'conflicto';
    const { error: errorFoto } = await cliente.storage.from(bucket).upload(rutaFoto(registro), await leerFoto(), {
      contentType: 'image/jpeg', upsert: false, cacheControl: '0',
    });
    // La ruta es estable y solo su autor puede ocuparla. PostgreSQL vuelve a verificar la propiedad.
    if (errorFoto && errorFoto.status !== 409 && !['409', 'Duplicate', 'ResourceAlreadyExists', 'KeyAlreadyExists'].includes(errorFoto.statusCode ?? '')) {
      const registrada = await buscarRegistro(cliente, registro.mesaId, registro.dignidad);
      if (registrada) return registrada.id === registro.id ? 'ya_registrada' : 'conflicto';
      throw falloRemoto(errorFoto.status ?? 0, errorFoto.statusCode);
    }
    const { data, error, status } = await cliente.rpc('registrar_acta', {
      p_acta_id: registro.id, p_mesa_id: registro.mesaId, p_dignidad: registro.dignidad,
      p_confirmada_en: registro.confirmadaEn, p_resultados: registro.datos.resultados,
      p_votos: registro.datos.votos, p_evidencia: registro.foto.ubicacion,
    });
    if (error) throw falloRemoto(status, error.code);
    return z.enum(['registrada', 'ya_registrada', 'conflicto']).parse(data);
  },
};
