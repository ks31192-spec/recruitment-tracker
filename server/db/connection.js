import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Turso (libSQL) when configured; otherwise a local SQLite file.
// On Vercel the bundle dir is read-only, so fall back to the writable (but
// ephemeral) /tmp — data there resets on cold starts until Turso is set up.
const localFile = process.env.VERCEL ? '/tmp/recruitment.db' : join(__dirname, 'recruitment.db');
const url = process.env.TURSO_DATABASE_URL || `file:${localFile}`;
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient({ url, authToken, intMode: 'number' });

function rowToObj(row, columns) {
  const o = {};
  for (let i = 0; i < columns.length; i++) o[columns[i]] = row[i];
  return o;
}

// Drop-in async replacement for the previous better-sqlite3-style wrapper.
const wrapper = {
  prepare(sql) {
    return {
      async run(...params) {
        const r = await client.execute({ sql, args: params });
        return {
          lastInsertRowid: r.lastInsertRowid == null ? undefined : Number(r.lastInsertRowid),
          changes: r.rowsAffected,
        };
      },
      async get(...params) {
        const r = await client.execute({ sql, args: params });
        return r.rows.length ? rowToObj(r.rows[0], r.columns) : null;
      },
      async all(...params) {
        const r = await client.execute({ sql, args: params });
        return r.rows.map(row => rowToObj(row, r.columns));
      },
    };
  },
  async exec(sql) {
    await client.executeMultiple(sql);
  },
  pragma() {},
  client,
};

// Ensure schema + seed data exist. Idempotent, runs once per process
// (the promise is cached), and safe to await on every request.
let readyPromise = null;
export function ensureReady() {
  if (!readyPromise) {
    readyPromise = (async () => {
      const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
      await client.executeMultiple(schema);

      const hash = bcrypt.hashSync('Admin@123', 10);
      await client.execute({
        sql: 'INSERT OR IGNORE INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
        args: ['Principal', 'admin@amworld.in', hash, 'super_admin'],
      });

      for (const d of ['Pre-Primary', 'Primary', 'Middle', 'Senior Secondary', 'Administration', 'Support Staff']) {
        await client.execute({ sql: 'INSERT OR IGNORE INTO departments (name) VALUES (?)', args: [d] });
      }

      for (const t of ['PRT', 'TGT', 'PGT', 'Coordinator', 'Head of Department', 'Lab Assistant', 'Librarian', 'Counsellor', 'Sports Coach', 'IT Support', 'Office Assistant', 'Accountant']) {
        await client.execute({ sql: 'INSERT OR IGNORE INTO designations (title) VALUES (?)', args: [t] });
      }

      await client.execute({ sql: 'INSERT OR IGNORE INTO academic_years (label, start_date, end_date, is_current) VALUES (?, ?, ?, ?)', args: ['2025-26', '2025-04-01', '2026-03-31', 1] });
      await client.execute({ sql: 'INSERT OR IGNORE INTO academic_years (label, start_date, end_date, is_current) VALUES (?, ?, ?, ?)', args: ['2024-25', '2024-04-01', '2025-03-31', 0] });
    })();
  }
  return readyPromise;
}

export default wrapper;
