import { useEffect, useState } from 'react';
import api from '../services/api';
import { isOnline, queueCount, syncQueue } from '../services/offline';

export default function SyncStatus({ className = '' }) {
  const [online, setOnline] = useState(isOnline());
  const [pending, setPending] = useState(queueCount());
  const [syncing, setSyncing] = useState(false);
  const [lastMsg, setLastMsg] = useState('');

  const refresh = () => setPending(queueCount());

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
    if (!isOnline() || queueCount() === 0) return;
    setSyncing(true);
    try {
      const r = await syncQueue(api);
      setLastMsg(r.synced ? `Synced ${r.synced}` : '');
      refresh();
    } finally {
      setSyncing(false);
    }
  };

  if (online && pending === 0 && !syncing) {
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
        className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-400 text-amber-950 ${className}`}
      >
        Offline{pending > 0 ? ` · ${pending} pending` : ''}
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
      {syncing ? 'Syncing…' : `${pending} pending · tap sync`}
      {lastMsg ? ` · ${lastMsg}` : ''}
    </button>
  );
}
