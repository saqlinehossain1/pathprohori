// Minimal IndexedDB wrapper for the Offline Memory Storage Queue. Plain IndexedDB
// (no external dependency) since the queue is just an append-only list of
// { lat, lng, timestamp, tripId } points - persists across full page reloads / app
// restarts, unlike in-memory state, and has no practical size cap unlike localStorage.
const DB_NAME = 'pathprohori_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'locationQueue';

let dbPromise = null;

const openDb = () => {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB is not supported in this browser'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('tripId', 'tripId', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
};

export const enqueueLocationPoint = async ({ lat, lng, timestamp, tripId }) => {
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).add({ lat, lng, timestamp, tripId });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('[Offline Queue] Failed to persist point to IndexedDB:', err);
  }
};

export const getAllQueuedPoints = async () => {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('[Offline Queue] Failed to read queued points from IndexedDB:', err);
    return [];
  }
};

export const removeQueuedPoints = async (ids) => {
  if (!ids || ids.length === 0) return;
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      ids.forEach((id) => store.delete(id));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('[Offline Queue] Failed to remove flushed points from IndexedDB:', err);
  }
};

export const getQueueCount = async () => {
  const points = await getAllQueuedPoints();
  return points.length;
};
