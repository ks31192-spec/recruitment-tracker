import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import { getDb } from '../db/firebase.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const localRoot = process.env.VERCEL ? '/tmp/uploads' : join(__dirname, '..', 'uploads');

// Vercel's filesystem is read-only apart from /tmp, and /tmp is wiped whenever the
// lambda goes cold — so anything written there is lost. Keep the bytes in Firestore
// instead, the same store the SQLite blob already lives in.
const COLLECTION = 'uploaded_files';
// A Firestore document tops out at 1 MiB and base64 inflates by 4/3, so hold each
// chunk well under that once encoded.
const CHUNK_BYTES = 600 * 1024;

const MIME_BY_EXT = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.txt': 'text/plain',
};

export function mimeFor(name) {
  return MIME_BY_EXT[extname(name || '').toLowerCase()] || 'application/octet-stream';
}

function cloud() {
  if (!process.env.VERCEL) return null;
  return getDb();
}

// Keys are relative paths like `12/1737-9921.pdf`. Part of one comes from a URL
// parameter, so refuse anything that could climb out of the uploads root.
export function isSafeKey(key) {
  return typeof key === 'string'
    && key.length > 0
    && !key.includes('\\')
    && !key.split('/').some(seg => seg === '' || seg === '.' || seg === '..');
}

// Firestore document ids may not contain '/'.
const docId = key => key.replace(/\//g, '__');

/** Store a buffer under `key`. Returns the key. */
export async function saveFile(key, buffer, { name, mime } = {}) {
  if (!isSafeKey(key)) throw new Error('Invalid file key');
  const db = cloud();
  if (!db) {
    const dest = join(localRoot, key);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, buffer);
    return key;
  }

  const ref = db.collection(COLLECTION).doc(docId(key));
  const parts = [];
  for (let i = 0; i < buffer.length; i += CHUNK_BYTES) {
    parts.push(buffer.subarray(i, i + CHUNK_BYTES).toString('base64'));
  }

  const batch = db.batch();
  batch.set(ref, {
    key,
    name: name || key.split('/').pop(),
    mime: mime || mimeFor(name || key),
    size: buffer.length,
    chunks: parts.length,
    created_at: new Date().toISOString(),
  });
  parts.forEach((b64, i) => batch.set(ref.collection('parts').doc(String(i)), { b64 }));
  await batch.commit();
  return key;
}

/** Read a file back. Returns `{ buffer, name, mime }`, or null if it is gone. */
export async function readFile(key) {
  if (!isSafeKey(key)) return null;
  const db = cloud();
  if (!db) {
    const src = join(localRoot, key);
    if (!existsSync(src)) return null;
    const buffer = readFileSync(src);
    return { buffer, name: key.split('/').pop(), mime: mimeFor(key) };
  }

  const ref = db.collection(COLLECTION).doc(docId(key));
  const meta = await ref.get();
  if (!meta.exists) {
    // Files uploaded before this store existed only ever reached /tmp, and may
    // still be there if the same instance is serving the request.
    const src = join(localRoot, key);
    if (existsSync(src)) return { buffer: readFileSync(src), name: key.split('/').pop(), mime: mimeFor(key) };
    return null;
  }
  const { name, mime, chunks } = meta.data();
  const parts = await Promise.all(
    Array.from({ length: chunks }, (_, i) => ref.collection('parts').doc(String(i)).get())
  );
  const buffer = Buffer.concat(parts.map(p => Buffer.from(p.data()?.b64 || '', 'base64')));
  return { buffer, name, mime };
}

/** Remove a file and its chunks. Missing files are not an error. */
export async function deleteFile(key) {
  if (!isSafeKey(key)) return;
  const db = cloud();
  if (!db) {
    const dest = join(localRoot, key);
    if (existsSync(dest)) rmSync(dest, { force: true });
    return;
  }
  const ref = db.collection(COLLECTION).doc(docId(key));
  const parts = await ref.collection('parts').listDocuments();
  const batch = db.batch();
  parts.forEach(p => batch.delete(p));
  batch.delete(ref);
  await batch.commit();
}

/** Filename that will not collide, keeping the original extension. */
export function uniqueName(originalName) {
  const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
  return unique + extname(originalName || '').toLowerCase();
}
