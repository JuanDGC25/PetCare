import pg from 'pg';
import { readFile } from 'node:fs/promises';
import { config } from './config.js';

const { Pool, types } = pg;

types.setTypeParser(1082, (v) => v);
types.setTypeParser(1700, (v) => (v === null ? null : Number(v)));

export const pool = new Pool({ connectionString: config.databaseUrl });

export const query = (text, params) => pool.query(text, params);

export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function initDatabase({ retries = 15, delayMs = 2000 } = {}) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await pool.query('SELECT 1');
      break;
    } catch (err) {
      if (attempt === retries) throw err;
      console.log(`[db] Esperando a PostgreSQL (intento ${attempt}/${retries})...`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  const schema = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');
  await pool.query(schema);
  console.log('[db] Esquema verificado');
}



