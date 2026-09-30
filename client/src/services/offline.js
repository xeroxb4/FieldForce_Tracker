/**
 * Offline queue + cache + conflict resolution for FieldForce Tracker
 *
 * Rules on sync:
 * - 409 ALREADY_SYNCED / idempotent → treat as success, drop from queue
 * - 200 with _conflict merged_callback → success
 * - 4xx validation that cannot retry → drop + record conflict for user
 * - network / 5xx → keep in queue (retry later)
 * - max 5 attempts then mark conflict and drop to avoid infinite loop
 */

const KEYS = {
  queue: 'ff_offline_queue',
  conflicts: 'ff_sync_conflicts',
  products: 'ff_cache_products',
  beat: 'ff_cache_beat',
  week: 'ff_cache_week',
  outlets: 'ff_cache_outlets',
  lastSync: 'ff_last_sync',
};

const MAX_ATTEMPTS = 5;

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

export function getConflicts() {
  return read(KEYS.conflicts, []);
}

export function clearConflicts() {
  write(KEYS.conflicts, []);
  emit();
}

function emit() {
  try {
    window.dispatchEvent(new Event('ff-queue-change'));
  } catch {
    /* ignore */
  }
}

function conflictKey(action) {
  const p = action.payload || {};
  if (action.type === 'visit') {
    return `visit:${p.outletId || p.shopName}:${p.date || ''}:${p.outcome || ''}`;
  }
  if (action.type === 'callback-order') {
    return `callback:${p.visitId}`;
  }
  if (action.type === 'avc-photo') {
    return `avc:${p.outletId}`;
  }
  if (action.type === 'attendance' || action.type === 'attendance-out') {
    return action.type;
  }
  if (action.type === 'wrapup') {
    return `wrapup:${p.date || ''}`;
  }
  return `${action.type}:${JSON.stringify(p).slice(0, 80)}`;
}

/** Enqueue with dedupe: newer item replaces older same key */
export function enqueue(action) {
  const q = getQueue();
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const key = conflictKey(action);
  const filtered = q.filter((i) => conflictKey(i) !== key);

  // Attach offlineId into visit payloads for server idempotency
  let payload = action.payload;
  if (action.type === 'visit' && payload && typeof payload === 'object') {
    payload = { ...payload, offlineId: id, syncedFromOffline: true };
  }

  const item = {
    id,
    key,
    createdAt: new Date().toISOString(),
    attempts: 0,
    type: action.type,
    payload,
  };
  filtered.push(item);
  write(KEYS.queue, filtered);
  emit();
  return item;
}

export function removeFromQueue(id) {
  write(
    KEYS.queue,
    getQueue().filter((i) => i.id !== id)
  );
  emit();
}

function bumpAttempt(id) {
  const q = getQueue().map((i) =>
    i.id === id ? { ...i, attempts: (i.attempts || 0) + 1, lastAttemptAt: new Date().toISOString() } : i
  );
  write(KEYS.queue, q);
}

function recordConflict(item, reason) {
  const list = getConflicts();
  list.unshift({
    id: item.id,
    type: item.type,
    reason,
    at: new Date().toISOString(),
    summary: summarize(item),
  });
  write(KEYS.conflicts, list.slice(0, 30));
  removeFromQueue(item.id);
  emit();
}

function summarize(item) {
  const p = item.payload || {};
  if (item.type === 'visit') {
    return `${p.shopName || p.outletId || 'visit'} · ${p.outcome || ''} · GHS ${p.amount || 0}`;
  }
  if (item.type === 'callback-order') {
    return `Call-back · visit ${p.visitId}`;
  }
  if (item.type === 'avc-photo') {
    return `AVC photo · ${p.outletId}`;
  }
  return item.type;
}

export function queueCount() {
  return getQueue().length;
}

export function conflictCount() {
  return getConflicts().length;
}

function isResolvedConflict(err) {
  const status = err?.response?.status;
  const code = err?.response?.data?.code;
  const msg = (err?.response?.data?.message || '').toLowerCase();

  if (status === 409) return true;
  if (code === 'ALREADY_SYNCED') return true;
  if (status === 400 && msg.includes('already has an order')) return true;
  if (status === 400 && msg.includes('already logged')) return true;
  if (status === 404 && msg.includes('visit not found')) return true;
  // Attendance re-check often ok
  if (status === 400 && msg.includes('already checked')) return true;
  return false;
}

function isPermanentClientError(err) {
  const status = err?.response?.status;
  if (!status) return false;
  if (status === 401 || status === 403) return true;
  if (status === 400 || status === 422) return true;
  return false;
}

async function postItem(api, item) {
  if (item.type === 'visit') {
    return api.post('/omr/visits', item.payload);
  }
  if (item.type === 'attendance') {
    return api.post('/attendance/check-in', item.payload);
  }
  if (item.type === 'attendance-out') {
    return api.post('/attendance/check-out', item.payload);
  }
  if (item.type === 'wrapup') {
    return api.post('/omr/wrapups', item.payload);
  }
  if (item.type === 'credit') {
    return api.post('/credits', item.payload);
  }
  if (item.type === 'credit-collect') {
    return api.post(`/credits/${item.payload.id}/collect`, item.payload.body || {});
  }
  if (item.type === 'avc-photo') {
    return api.post('/omr/avc-photos', item.payload, { timeout: 60000 });
  }
  if (item.type === 'callback-order') {
    return api.patch(`/omr/visits/${item.payload.visitId}/callback-order`, item.payload.body);
  }
  throw new Error(`Unknown queue type: ${item.type}`);
}

export async function syncQueue(api) {
  if (!isOnline()) {
    return {
      synced: 0,
      failed: 0,
      conflicts: 0,
      remaining: getQueue().length,
    };
  }

  const q = [...getQueue()];
  let synced = 0;
  let failed = 0;
  let conflicts = 0;

  for (const item of q) {
    try {
      await postItem(api, item);
      removeFromQueue(item.id);
      synced += 1;
    } catch (err) {
      // Already on server / merged → success path
      if (isResolvedConflict(err)) {
        removeFromQueue(item.id);
        synced += 1;
        console.info('Sync conflict resolved (server wins / already synced):', item.type);
        continue;
      }

      bumpAttempt(item.id);
      const attempts = (item.attempts || 0) + 1;

      if (isPermanentClientError(err) || attempts >= MAX_ATTEMPTS) {
        const reason =
          err?.response?.data?.message ||
          err?.message ||
          (attempts >= MAX_ATTEMPTS ? 'Max sync attempts reached' : 'Rejected by server');
        recordConflict(item, reason);
        conflicts += 1;
        console.warn('Sync dropped as conflict:', item.type, reason);
      } else {
        failed += 1;
        console.warn('Sync retry later:', item.type, err?.response?.data || err.message);
      }
    }
  }

  if (synced > 0) markSynced();
  return {
    synced,
    failed,
    conflicts,
    remaining: getQueue().length,
  };
}
