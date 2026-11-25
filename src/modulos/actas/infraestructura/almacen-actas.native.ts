import { openDatabaseAsync } from 'expo-sqlite';

import type { AlmacenActas } from '../aplicacion/actas';
import type { AlmacenCola, EntradaCola } from '../aplicacion/sincronizacion';
import { esquemaConfirmada, esquemaContexto, esquemaRegistroLocal, type RegistroLocal } from '../dominio/acta';

let apertura: ReturnType<typeof iniciar> | undefined;

async function iniciar() {
  const db = await openDatabaseAsync('actas-electorales.db');
  try {
    await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    PRAGMA recursive_triggers = ON;
    PRAGMA foreign_keys = ON;
    BEGIN IMMEDIATE;
    CREATE TABLE IF NOT EXISTS contexto_mesa (
      autor_id TEXT PRIMARY KEY NOT NULL,
      datos TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS actas_locales (
      id TEXT PRIMARY KEY NOT NULL,
      autor_id TEXT NOT NULL,
      mesa_id INTEGER NOT NULL,
      dignidad TEXT NOT NULL CHECK(dignidad IN ('alcaldia','prefectura')),
      estado TEXT NOT NULL CHECK(estado IN ('borrador','pendiente','enviada','conflicto')),
      datos TEXT NOT NULL,
      UNIQUE(autor_id, mesa_id, dignidad)
    );
    CREATE INDEX IF NOT EXISTS actas_locales_por_estado ON actas_locales(autor_id, estado);
    CREATE TRIGGER IF NOT EXISTS actas_confirmadas_sin_borrado
      BEFORE DELETE ON actas_locales WHEN OLD.estado <> 'borrador'
      BEGIN SELECT RAISE(ABORT, 'El acta confirmada no puede eliminarse.'); END;
    CREATE TRIGGER IF NOT EXISTS actas_confirmadas_solo_resultado
      BEFORE UPDATE ON actas_locales WHEN OLD.estado <> 'borrador' AND (
        OLD.estado <> 'pendiente' OR NEW.estado NOT IN ('enviada','conflicto')
        OR NEW.id <> OLD.id OR NEW.autor_id <> OLD.autor_id OR NEW.mesa_id <> OLD.mesa_id
        OR NEW.dignidad <> OLD.dignidad
        OR NEW.datos <> json_set(OLD.datos, '$.estado', NEW.estado)
      ) BEGIN SELECT RAISE(ABORT, 'El acta confirmada no puede editarse.'); END;
    CREATE TABLE IF NOT EXISTS cola_actas (
      acta_id TEXT PRIMARY KEY NOT NULL REFERENCES actas_locales(id),
      autor_id TEXT NOT NULL,
      estado TEXT NOT NULL CHECK(estado IN ('pendiente','sincronizando','error')),
      motivo TEXT CHECK(motivo IN ('red','permisos','fotografia','servidor','datos')),
      proximo INTEGER,
      intentos INTEGER NOT NULL DEFAULT 0,
      reserva TEXT
    );
    CREATE INDEX IF NOT EXISTS cola_actas_por_autor ON cola_actas(autor_id, proximo);
    CREATE TRIGGER IF NOT EXISTS encolar_acta_confirmada
      AFTER UPDATE OF estado ON actas_locales WHEN OLD.estado = 'borrador' AND NEW.estado = 'pendiente'
      BEGIN
        INSERT INTO cola_actas(acta_id,autor_id,estado,proximo) VALUES(NEW.id,NEW.autor_id,'pendiente',0);
      END;
    CREATE TRIGGER IF NOT EXISTS retirar_acta_resuelta
      AFTER UPDATE OF estado ON actas_locales WHEN NEW.estado IN ('enviada','conflicto')
      BEGIN DELETE FROM cola_actas WHERE acta_id = NEW.id AND autor_id = NEW.autor_id; END;
    INSERT INTO cola_actas(acta_id,autor_id,estado,proximo)
    SELECT id,autor_id,'pendiente',0 FROM actas_locales WHERE estado = 'pendiente'
    ON CONFLICT(acta_id) DO NOTHING;
    UPDATE cola_actas SET estado='pendiente', reserva=NULL, proximo=0 WHERE estado='sincronizando';
    COMMIT;
  `);
  } catch (error) {
    await db.execAsync('ROLLBACK').catch(() => undefined);
    await db.closeAsync();
    throw error;
  }
  return db;
}

function base() {
  apertura ??= iniciar().catch((error: unknown) => { apertura = undefined; throw error; });
  return apertura;
}

type Fila = { datos: string };
const leer = ({ datos }: Fila) => esquemaRegistroLocal.parse(JSON.parse(datos));

const claves = ({ id, autorId, mesaId, dignidad }: RegistroLocal) => [id, autorId, mesaId, dignidad] as const;

async function actualizarDesdeBorrador(registro: RegistroLocal) {
  const db = await base();
  const resultado = await db.runAsync(`
    UPDATE actas_locales SET estado = ?, datos = ?
    WHERE id = ? AND autor_id = ? AND mesa_id = ? AND dignidad = ? AND estado = 'borrador'
  `, registro.estado, JSON.stringify(registro), ...claves(registro));
  if (resultado.changes !== 1) throw new Error('Esta acta ya está confirmada. Vuelve a abrirla para consultar su estado.');
}

export const almacenActas: AlmacenActas & AlmacenCola = {
  async contexto(autorId) {
    const db = await base();
    const fila = await db.getFirstAsync<Fila>('SELECT datos FROM contexto_mesa WHERE autor_id = ?', autorId);
    return fila ? esquemaContexto.parse(JSON.parse(fila.datos)) : null;
  },
  async guardarContexto(autorId, contexto) {
    const db = await base();
    if (!contexto) {
      await db.runAsync('DELETE FROM contexto_mesa WHERE autor_id = ?', autorId);
      return;
    }
    await db.runAsync(`
      INSERT INTO contexto_mesa (autor_id, datos) VALUES (?, ?)
      ON CONFLICT(autor_id) DO UPDATE SET datos = excluded.datos
    `, autorId, JSON.stringify(contexto));
  },
  async listar({ autorId, mesaId }) {
    const db = await base();
    return (await db.getAllAsync<Fila>(
      'SELECT datos FROM actas_locales WHERE autor_id = ? AND mesa_id = ?', autorId, mesaId,
    )).map(leer);
  },
  async abrir(borrador) {
    const db = await base();
    await db.runAsync(`
      INSERT INTO actas_locales (id, autor_id, mesa_id, dignidad, estado, datos)
      VALUES (?, ?, ?, ?, 'borrador', ?) ON CONFLICT (autor_id, mesa_id, dignidad) DO NOTHING
    `, ...claves(borrador), JSON.stringify(borrador));
    const fila = await db.getFirstAsync<Fila>(
      'SELECT datos FROM actas_locales WHERE autor_id = ? AND mesa_id = ? AND dignidad = ?',
      borrador.autorId, borrador.mesaId, borrador.dignidad,
    );
    if (!fila) throw new Error('No pudimos abrir el acta local.');
    return leer(fila);
  },
  actualizar: actualizarDesdeBorrador,
  confirmar: actualizarDesdeBorrador,
  async cola(autorId) {
    const db = await base();
    const filas = await db.getAllAsync<Fila & Omit<EntradaCola, 'acta'>>(`
      SELECT a.datos, c.estado, c.motivo, c.proximo FROM cola_actas c
      JOIN actas_locales a ON a.id = c.acta_id AND a.autor_id = c.autor_id
      WHERE c.autor_id = ? AND a.estado = 'pendiente' ORDER BY a.rowid
    `, autorId);
    return filas.map(({ datos, ...entrada }) => ({
      ...entrada, acta: esquemaConfirmada.parse(JSON.parse(datos)),
    }));
  },
  async tomar({ id, autorId }, reserva, ahora) {
    const db = await base();
    const resultado = await db.getFirstAsync<{ intentos: number }>(`
      UPDATE cola_actas
      SET estado='sincronizando', motivo=NULL, reserva=?, proximo=?, intentos=intentos+1
      WHERE acta_id=? AND autor_id=? AND proximo <= ?
      RETURNING intentos
    `, reserva, ahora + 90_000, id, autorId, ahora);
    return resultado?.intentos ?? null;
  },
  async resolver({ id, autorId }, reserva, estado) {
    const db = await base();
    await db.runAsync(`
      UPDATE actas_locales SET estado = ?, datos = json_set(datos, '$.estado', ?)
      WHERE id=? AND autor_id=? AND estado='pendiente'
        AND EXISTS (SELECT 1 FROM cola_actas WHERE acta_id=? AND autor_id=? AND reserva=?)
    `, estado, estado, id, autorId, id, autorId, reserva);
  },
  async devolver({ id, autorId }, reserva, motivo, proximo) {
    const db = await base();
    await db.runAsync(`
      UPDATE cola_actas SET estado=?, motivo=?, proximo=?, reserva=NULL
      WHERE acta_id=? AND autor_id=? AND reserva=?
    `, motivo ? 'error' : 'pendiente', motivo, proximo, id, autorId, reserva);
  },
  async adelantar({ id, autorId }) {
    const db = await base();
    await db.runAsync(`
      UPDATE cola_actas SET estado='pendiente', motivo=NULL, proximo=0
      WHERE acta_id=? AND autor_id=? AND estado<>'sincronizando'
        AND (motivo IS NULL OR motivo NOT IN ('fotografia','datos'))
    `, id, autorId);
  },
  async reactivarRed(autorId) {
    const db = await base();
    await db.runAsync("UPDATE cola_actas SET proximo=0 WHERE autor_id=? AND estado='error' AND motivo='red'", autorId);
  },
};
