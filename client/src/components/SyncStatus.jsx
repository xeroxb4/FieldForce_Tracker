import { useEffect, useState } from 'react';
import api from '../services/api';
import {
  isOnline,
  queueCount,
  conflictCount,
  syncQueue,
  getConflicts,
  clearConflicts,
} from '../services/offline';

export default function SyncStatus({ className = '' }) {
  const [online, setOnline] = useState(isOnline());
  const [pending, setPending] = useState(queueCount());
  const [conflicts, setConflicts] = useState(conflictCount());
  const [syncing, setSyncing] = useState(false);
  const [lastMsg, setLastMsg] = useState('');

  const refresh = () => {
    setPending(queueCount());
    setConflicts(conflictCount());
  };

  useEffect(() => {
    const on = () => {
      setOnline(true);
      refresh();
      flush();
    };
    const off = () => {
      setOnline(false);
      refresh();
    };
    window.addEventListener('online', on);
    window.addEventListener('ff-queue-change', refresh);
    window.addEventListener('offline', off);
    const t = setInterval(refresh, 4000);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('ff-queue-change', refresh);
      window.removeEventListener('offline', off);
      clearInterval(t);
    };
  }, []);

  const flush = async () => {
    if (!isOnline() || (queueCount() === 0 && conflictCount() === 0)) return;
    setSyncing(true);
    try {
      const r = await syncQueue(api);
      refresh();
      const parts = [];
      if (r.synced) parts.push(`Synced ${r.synced}`);
      if (r.conflicts) parts.push(`${r.conflicts} conflict(s)`);
      setLastMsg(parts.join(' · '));
    } finally {
      setSyncing(false);
    }
  };

  const showConflicts = () => {
    const list = getConflicts();
    if (!list.length) return;
    const text = list
      .slice(0, 8)
      .map((c) => `• ${c.type}: ${c.summary || ''} — ${c.reason}`)
      .join('\n');
    const clear = window.confirm(
      `Sync conflicts (server already had data or item was rejected):\n\n${text}\n\nClear this list?`
    );
    if (clear) clearConflicts();
    refresh();
  };

  if (online && pending === 0 && !syncing && conflicts === 0) {
    return (
      <span
        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 ${className}`}
        title="Online · all saved"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        Synced
      </span>
    );
  }

  if (!online) {
    return (
      <button
        type="button"
        onClick={refresh}
        title="No network — data is saved on this phone and will upload when you are online"
        className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-400 text-amber-950 border border-amber-600/40 ${className}`}
      >
        ● Offline{pending > 0 ? ` · ${pending} saved` : ''}
      </button>
    );
  }

  if (conflicts > 0 && pending === 0 && !syncing) {
    return (
      <button
        type="button"
        onClick={showConflicts}
        className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-500 text-white ${className}`}
        title="Tap to view conflicts"
      >
        ● {conflicts} conflict{conflicts > 1 ? 's' : ''}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={flush}
      disabled={syncing}
      className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-sky-500 text-white ${className}`}
    >
      {syncing
        ? 'Syncing…'
        : pending > 0
        ? `${pending} pending · tap sync`
        : lastMsg || 'Sync'}
      {conflicts > 0 ? ` · ${conflicts}⚠` : ''}
    </button>
  );
}
