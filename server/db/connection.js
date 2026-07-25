import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import initSqlJs from 'sql.js/dist/sql-asm.js';
import SCHEMA_SQL from './schema-string.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// sql.js (asm.js build) — pure JS SQLite, no native deps.
// Local dev: persisted to disk file. Vercel: in-memory (reseeds on cold start).
const localFile = process.env.VERCEL ? null : join(__dirname, 'recruitment.db');
let dbData = null;
if (localFile && existsSync(localFile)) {
  dbData = readFileSync(localFile);
}
const SQL = await initSqlJs();
const sqlDb = dbData ? new SQL.Database(dbData) : new SQL.Database();

const save = localFile ? () => {
  writeFileSync(localFile, Buffer.from(sqlDb.export()));
} : () => {};

function execute(sql, args = []) {
  const params = args.map(a => a === undefined ? null : a);
  if (/^\s*(INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|PRAGMA)/i.test(sql)) {
    sqlDb.run(sql, params);
    save();
    const info = sqlDb.exec("SELECT last_insert_rowid() as id, changes() as c");
    const lastId = info[0]?.values[0]?.[0];
    const changes = info[0]?.values[0]?.[1];
    return { rows: [], columns: [], lastInsertRowid: lastId, rowsAffected: changes };
  }
  const stmt = sqlDb.prepare(sql);
  stmt.bind(params);
  const columns = stmt.getColumnNames();
  const rows = [];
  while (stmt.step()) rows.push(stmt.get());
  stmt.free();
  return { rows, columns, lastInsertRowid: undefined, rowsAffected: 0 };
}

function executeMultiple(sql) {
  sqlDb.run(sql);
  save();
}

function rowToObj(row, columns) {
  const o = {};
  for (let i = 0; i < columns.length; i++) o[columns[i]] = row[i];
  return o;
}

const wrapper = {
  prepare(sql) {
    return {
      async run(...params) {
        const r = execute(sql, params);
        return {
          lastInsertRowid: r.lastInsertRowid == null ? undefined : Number(r.lastInsertRowid),
          changes: r.rowsAffected,
        };
      },
      async get(...params) {
        const r = execute(sql, params);
        return r.rows.length ? rowToObj(r.rows[0], r.columns) : null;
      },
      async all(...params) {
        const r = execute(sql, params);
        return r.rows.map(row => rowToObj(row, r.columns));
      },
    };
  },
  async exec(sql) {
    executeMultiple(sql);
  },
  pragma() {},
};

let readyPromise = null;
export function ensureReady() {
  if (!readyPromise) {
    readyPromise = (async () => {
      try {
        executeMultiple(SCHEMA_SQL);
      } catch (e) {
        console.error('Schema init failed:', e.message);
        readyPromise = null;
        throw e;
      }

      const hash = bcrypt.hashSync('Admin@123', 10);
      execute(
        'INSERT OR IGNORE INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
        ['Principal', 'admin@amworld.in', hash, 'super_admin']
      );

      for (const d of ['Pre-Primary', 'Primary', 'Middle', 'Senior Secondary', 'Administration', 'Support Staff']) {
        execute('INSERT OR IGNORE INTO departments (name) VALUES (?)', [d]);
      }

      for (const t of ['PRT', 'TGT', 'PGT', 'Coordinator', 'Head of Department', 'Lab Assistant', 'Librarian', 'Counsellor', 'Sports Coach', 'IT Support', 'Office Assistant', 'Accountant']) {
        execute('INSERT OR IGNORE INTO designations (title) VALUES (?)', [t]);
      }

      execute('INSERT OR IGNORE INTO academic_years (label, start_date, end_date, is_current) VALUES (?, ?, ?, ?)', ['2025-26', '2025-04-01', '2026-03-31', 1]);
      execute('INSERT OR IGNORE INTO academic_years (label, start_date, end_date, is_current) VALUES (?, ?, ?, ?)', ['2024-25', '2024-04-01', '2025-03-31', 0]);
      save();
    })();
  }
  return readyPromise;
}

export default wrapper;
