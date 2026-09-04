/**
 * Offline queue + cache for FieldForce Tracker
 * Uses localStorage for simplicity and reliability on mobile browsers.
 */

const KEYS = {
  queue: 'ff_offline_queue',
  products: 'ff_cache_products',
  beat: 'ff_cache_beat',
  outlets: 'ff_cache_outlets',
  user: 'user',
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
  localStorage.setItem(key, JSON.stringify(value));
}

export function isOnline() {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

// ——— Cache ———
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

export function cacheOutlets(data) {
  write(KEYS.outlets, { data, savedAt: Date.now() });
}
export function getCachedOutlets() {
  return read(KEYS.outlets, null)?.data || null;
}

// ——— Queue ———
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
  return item;
}

export function removeFromQueue(id) {
  write(
    KEYS.queue,
    getQueue().filter((i) => i.id !== id)
  );
}

export function queueCount() {
  return getQueue().length;
}

/**
 * Flush queue when online.
 * action: { type: 'visit'|'attendance'|'wrapup'|'credit', payload }
 */
export async function syncQueue(api) {
  if (!isOnline()) return { synced: 0, failed: 0 };

  const q = getQueue();
  let synced = 0;
  let failed = 0;

  for (const item of q) {
    try {
      if (item.type === 'visit') {
        await api.post('/omr/visits', item.payload);
      } else if (item.type === 'attendance') {
        await api.post('/attendance/check-in', item.payload);
      } else if (item.type === 'wrapup') {
        await api.post('/omr/wrapups', item.payload);
      } else if (item.type === 'credit') {
        await api.post('/credits', item.payload);
      } else {
        continue;
      }
      removeFromQueue(item.id);
      synced += 1;
    } catch (err) {
      // Keep in queue for next attempt
      failed += 1;
      console.warn('Sync failed for', item.type, err?.response?.data || err.message);
    }
  }

  return { synced, failed, remaining: getQueue().length };
}
