import tripApi from '../api/tripApi';
import { getAllQueuedPoints, removeQueuedPoints } from '../utils/offlineLocationQueueDb';

// Cap each batch request at 500 points so a very long offline stretch (e.g. a long
// tunnel or a rural gap) doesn't try to upload one arbitrarily large payload.
const CHUNK_SIZE = 500;

let isFlushing = false;
let autoFlushInitialized = false;

const chunkArray = (arr, size) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

// Flushes the whole IndexedDB queue in ordered, per-trip batches. Points only leave
// IndexedDB once the server confirms a batch (HTTP 200/201) - if a batch fails (e.g.
// the connection drops again mid-upload), that batch and everything after it stays
// queued for the next retry so nothing is lost.
export const flushOfflineQueue = async () => {
  if (isFlushing) {
    console.log('[Offline Queue] Flush already in progress - skipping duplicate trigger.');
    return;
  }

  isFlushing = true;
  console.log('[Offline Queue] Flush started...');

  try {
    const points = await getAllQueuedPoints();
    if (points.length === 0) {
      console.log('[Offline Queue] Nothing to flush - queue is empty.');
      return;
    }

    const byTrip = new Map();
    for (const point of points) {
      if (!byTrip.has(point.tripId)) byTrip.set(point.tripId, []);
      byTrip.get(point.tripId).push(point);
    }

    for (const [tripId, tripPoints] of byTrip.entries()) {
      // Tagged to whichever tripId the point was captured under - still flushes
      // correctly even if that trip has since completed while we were offline.
      const ordered = [...tripPoints].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      const chunks = chunkArray(ordered, CHUNK_SIZE);

      for (const chunk of chunks) {
        try {
          await tripApi.sendCoordinateBatch(
            tripId,
            chunk.map(({ lat, lng, timestamp }) => ({ lat, lng, timestamp }))
          );
          await removeQueuedPoints(chunk.map((p) => p.id));
          console.log(`[Offline Queue] Flush succeeded: ${chunk.length} point(s) uploaded for trip ${tripId}.`);
        } catch (err) {
          console.error(
            `[Offline Queue] Flush FAILED for trip ${tripId} (${chunk.length} point(s) kept queued for retry):`,
            err.message || err
          );
          return; // stop here - remaining points stay in IndexedDB for the next 'online' event
        }
      }
    }
  } finally {
    isFlushing = false;
  }
};

// Registers a single global 'online' listener and performs one startup check. Covers
// "app fully closed while offline, reopened after connectivity returns": on the next
// load, if the queue is non-empty and we're already online, flush immediately instead
// of waiting for another 'online' transition that may never fire.
export const initOfflineQueueAutoFlush = () => {
  if (autoFlushInitialized) return;
  autoFlushInitialized = true;

  window.addEventListener('online', () => {
    console.log('[Offline Queue] Browser back ONLINE - auto-flushing queued location points.');
    flushOfflineQueue();
  });

  if (navigator.onLine) {
    flushOfflineQueue();
  }
};
