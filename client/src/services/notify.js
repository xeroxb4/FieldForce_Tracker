/**
 * In-app + browser notifications (works when app is open / installed).
 * Full silent push when app is closed needs VAPID + service worker subscription (optional later).
 */

const SEEN_KEY = 'ff_notif_seen_ids';

function seenIds() {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function markSeen(ids) {
  const s = seenIds();
  ids.forEach((id) => s.add(id));
  localStorage.setItem(SEEN_KEY, JSON.stringify([...s].slice(-200)));
}

export async function ensureNotifyPermission() {
  if (typeof Notification === 'undefined') return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const p = await Notification.requestPermission();
  return p === 'granted';
}

export function showLocalNotification(title, body, data = {}) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  try {
    const n = new Notification(title, {
      body,
      icon: '/favicon-32.png',
      badge: '/favicon-16.png',
      tag: data.tag || 'fieldforce',
      data,
    });
    n.onclick = () => {
      window.focus();
      if (data.url) window.location.href = data.url;
      n.close();
    };
  } catch {
    /* ignore */
  }
}

/** Poll admin notifications; fire browser alert for new unread */
export async function pollAdminNotifications(api) {
  try {
    const { data } = await api.get('/admin/notifications');
    const list = data?.notifications || data || [];
    const unread = list.filter((n) => !n.read);
    const seen = seenIds();
    const fresh = unread.filter((n) => n._id && !seen.has(n._id));
    if (fresh.length) {
      const first = fresh[0];
      showLocalNotification(
        first.title || 'FieldForce',
        first.message || 'New notification',
        { tag: first._id, url: '/admin/notifications' }
      );
      markSeen(fresh.map((n) => n._id));
    }
    return data?.unread ?? unread.length;
  } catch {
    return 0;
  }
}

/** OMR overdue credits */
export async function pollOverdueCredits(api) {
  try {
    const { data } = await api.get('/credits/summary');
    const overdue = data?.overdueCount || data?.overdue || 0;
    const key = `ff_overdue_alert_${new Date().toISOString().slice(0, 10)}`;
    if (overdue > 0 && !sessionStorage.getItem(key)) {
      showLocalNotification(
        'Overdue credits',
        `You have ${overdue} overdue collection(s). Open Owings.`,
        { tag: 'overdue', url: '/omr/owings' }
      );
      sessionStorage.setItem(key, '1');
    }
    return overdue;
  } catch {
    return 0;
  }
}
