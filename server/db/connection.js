import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, 'recruitment.db');
const isVercel = !!process.env.VERCEL;

const SQL = await initSqlJs();

let db;
if (!isVercel && existsSync(dbPath)) {
  const buffer = readFileSync(dbPath);
  db = new SQL.Database(buffer);
} else {
  db = new SQL.Database();
}

db.run('PRAGMA foreign_keys = ON');

if (isVercel) {
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
  db.run(schema);
  const hash = bcrypt.hashSync('Admin@123', 10);
  db.run(`INSERT OR IGNORE INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)`, ['Principal', 'admin@amworld.in', hash, 'super_admin']);
  ['Pre-Primary', 'Primary', 'Middle', 'Senior Secondary', 'Administration', 'Support Staff'].forEach(d => {
    db.run(`INSERT OR IGNORE INTO departments (name) VALUES (?)`, [d]);
  });
  ['PRT', 'TGT', 'PGT', 'Coordinator', 'Head of Department', 'Lab Assistant', 'Librarian', 'Counsellor', 'Sports Coach', 'IT Support', 'Office Assistant', 'Accountant'].forEach(t => {
    db.run(`INSERT OR IGNORE INTO designations (title) VALUES (?)`, [t]);
  });
  db.run(`INSERT OR IGNORE INTO academic_years (label, start_date, end_date, is_current) VALUES (?, ?, ?, ?)`, ['2025-26', '2025-04-01', '2026-03-31', 1]);
  db.run(`INSERT OR IGNORE INTO academic_years (label, start_date, end_date, is_current) VALUES (?, ?, ?, ?)`, ['2024-25', '2024-04-01', '2025-03-31', 0]);
}

function save() {
  if (isVercel) return;
  const data = db.export();
  writeFileSync(dbPath, Buffer.from(data));
}

const wrapper = {
  prepare(sql) {
    return {
      run(...params) {
        db.run(sql, params);
        save();
        const lastId = db.exec('SELECT last_insert_rowid() as id')[0]?.values[0][0];
        const changes = db.getRowsModified();
        return { lastInsertRowid: lastId, changes };
      },
      get(...params) {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        let row = null;
        if (stmt.step()) {
          const cols = stmt.getColumnNames();
          const vals = stmt.get();
          row = {};
          cols.forEach((c, i) => row[c] = vals[i]);
        }
        stmt.free();
        return row;
      },
      all(...params) {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        const rows = [];
        const cols = stmt.getColumnNames();
        while (stmt.step()) {
          const vals = stmt.get();
          const row = {};
          cols.forEach((c, i) => row[c] = vals[i]);
          rows.push(row);
        }
        stmt.free();
        return rows;
      }
    };
  },
  exec(sql) {
    db.run(sql);
    save();
  },
  pragma() {}
};

export default wrapper;
