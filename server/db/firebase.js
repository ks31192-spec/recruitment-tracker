import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let db = null;

export function getDb() {
  if (db) return db;
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) return null;

  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    if (!getApps().length) {
      initializeApp({ credential: cert(serviceAccount) });
    }
    db = getFirestore();
    return db;
  } catch (e) {
    console.error('Firebase init failed:', e.message);
    return null;
  }
}
