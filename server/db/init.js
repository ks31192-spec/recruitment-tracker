// Schema creation + seeding are handled by ensureReady() in connection.js.
import { ensureReady } from './connection.js';

await ensureReady();
console.log('Database initialized (schema + seed ensured).');
process.exit(0);
