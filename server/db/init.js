import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, 'recruitment.db');
const schemaPath = join(__dirname, 'schema.sql');

const SQL = await initSqlJs();
let db;
if (existsSync(dbPath)) {
  db = new SQL.Database(readFileSync(dbPath));
} else {
  db = new SQL.Database();
}

const schema = readFileSync(schemaPath, 'utf-8');
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

const data = db.export();
writeFileSync(dbPath, Buffer.from(data));

console.log('Database initialized successfully at', dbPath);
db.close();
