/**
 * Offline queue + cache for FieldForce Tracker
 */

const KEYS = {
  queue: 'ff_offline_queue',
  products: 'ff_cache_products',
  beat: 'ff_cache_beat',
  week: 'ff_cache_week',
  outlets: 'ff_cache_outlets',
  lastSync: 'ff_last_sync',
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('cache write failed', e);
  }
}

export function isOnline() {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

export function cacheProducts(data) {
  write(KEYS.products, { data, savedAt: Date.now() });
}
export function getCachedProducts() {
  return read(KEYS.products, null)?.data || null;
}

export function cacheBeat(data) {
  write(KEYS.beat, { data, savedAt: Date.now() });
}
export function getCachedBeat() {
  return read(KEYS.beat, null)?.data || null;
}

export function cacheWeek(data) {
  write(KEYS.week, { data, savedAt: Date.now() });
}
export function getCachedWeek() {
  return read(KEYS.week, null)?.data || null;
}

export function cacheOutlets(data) {
  write(KEYS.outlets, { data, savedAt: Date.now() });
}
export function getCachedOutlets() {
  return read(KEYS.outlets, null)?.data || null;
}

export function markSynced() {
  write(KEYS.lastSync, Date.now());
}
export function lastSyncAt() {
  return read(KEYS.lastSync, null);
}

export function getQueue() {
  return read(KEYS.queue, []);
}

export function enqueue(action) {
  const q = getQueue();
  const item = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    ...action,
  };
  q.push(item);
  write(KEYS.queue, q);
  try {
    window.dispatchEvent(new Event('ff-queue-change'));
  } catch {
    /* ignore */
  }
  return item;
}

export function removeFromQueue(id) {
  write(
    KEYS.queue,
    getQueue().filter((i) => i.id !== id)
  );
  try {
    window.dispatchEvent(new Event('ff-queue-change'));
  } catch {
    /* ignore */
  }
}

export function queueCount() {
  return getQueue().length;
}

export async function syncQueue(api) {
  if (!isOnline()) return { synced: 0, failed: 0, remaining: getQueue().length };

  const q = [...getQueue()];
  let synced = 0;
  let failed = 0;

  for (const item of q) {
    try {
      if (item.type === 'visit') {
        await api.post('/omr/visits', item.payload);
      } else if (item.type === 'attendance') {
        await api.post('/attendance/check-in', item.payload);
      } else if (item.type === 'attendance-out') {
        await api.post('/attendance/check-out', item.payload);
      } else if (item.type === 'wrapup') {
        await api.post('/omr/wrapups', item.payload);
      } else if (item.type === 'credit') {
        await api.post('/credits', item.payload);
      } else if (item.type === 'credit-collect') {
        await api.post(`/credits/${item.payload.id}/collect`, item.payload.body || {});
      } else {
        continue;
      }
      removeFromQueue(item.id);
      synced += 1;
    } catch (err) {
      failed += 1;
      console.warn('Sync failed for', item.type, err?.response?.data || err.message);
    }
  }

  if (synced > 0) markSynced();
  return { synced, failed, remaining: getQueue().length };
}
