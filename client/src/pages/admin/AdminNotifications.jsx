import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { useAdminPremium, AdminPageHeader } from '../../lib/adminPremium';

function timeAgo(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function typeMeta(type) {
  if (type === 'outlet_pending') {
    return {
      label: 'Outlet approval',
      accent: '#f59e0b',
      bg: 'bg-amber-500/15',
      icon: '🏪',
    };
  }
  if (type === 'outlet_approved' || type === 'approved') {
    return {
      label: 'Approved',
      accent: '#10b981',
      bg: 'bg-emerald-500/15',
      icon: '✓',
    };
  }
  return {
    label: 'System',
    accent: '#2596be',
    bg: 'bg-sky-500/15',
    icon: '🔔',
  };
}

export default function AdminNotifications() {
  const { dark } = useTheme();
  const ap = useAdminPremium(dark);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api
      .get('/admin/notifications')
      .then((r) => {
        setItems(r.data.notifications || []);
        setUnread(r.data.unread || 0);
        setTotal(r.data.total ?? (r.data.notifications || []).length);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const mark = async (id) => {
    await api.put(`/admin/notifications/${id}/read`);
    load();
  };

  const markAll = async () => {
    await api.put('/admin/notifications/read-all');
    load();
  };

  const clearRead = async () => {
    if (!window.confirm('Remove all read notifications from the list?')) return;
    try {
      await api.delete('/admin/notifications/read');
      load();
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to clear');
    }
  };

  const shell = dark
    ? 'bg-slate-900/80 border-slate-700/80'
    : 'bg-white border-slate-200/90 shadow-sm';
  const muted = dark ? 'text-slate-300' : 'text-slate-500';
  const title = dark ? 'text-white' : 'text-slate-900';

  return (
    <div className="w-full max-w-5xl space-y-5 px-1 sm:px-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className={`text-[11px] font-bold uppercase tracking-widest ${muted}`}>Admin</p>
          <h1 className={`text-2xl font-extrabold tracking-tight ${title}`}>Notifications</h1>
          <p className={`text-sm mt-1 ${muted}`}>
            {loading ? 'Loading…' : (
              <>
                <span className="font-semibold text-[#3F258B]">{unread}</span> unread
                {total > 0 && (
                  <>
                    <span className="mx-1.5 opacity-40">·</span>
                    {total} on file
                  </>
                )}
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={markAll}
            className="text-xs font-bold px-4 py-2.5 rounded-full bg-[#3F258B] text-white shadow-md shadow-[#117ea6]/25 hover:brightness-110 transition"
          >
            Mark all read
          </button>
          <button
            type="button"
            onClick={clearRead}
            className={`text-xs font-bold px-4 py-2.5 rounded-full border transition ${
              dark
                ? 'border-slate-600 text-slate-300 hover:bg-slate-800'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Clear read
          </button>
        </div>
      </div>

      {/* List panel */}
      <div className={`rounded-3xl border overflow-hidden ${shell}`}>
        <div
          className={`px-4 py-3 border-b flex items-center justify-between ${
            dark ? 'border-slate-700/80 bg-slate-950/40' : 'border-slate-100 bg-slate-50/80'
          }`}
        >
          <span className={`text-[11px] font-bold uppercase tracking-wide ${muted}`}>
            Inbox
          </span>
          <span className={`text-[11px] ${muted}`}>Scroll · latest {items.length}</span>
        </div>

        <div className="max-h-[min(72vh,640px)] overflow-y-auto overscroll-contain divide-y divide-slate-700/20 dark:divide-slate-700/50">
          {loading && (
            <div className={`p-8 text-center text-sm ${muted}`}>Loading notifications…</div>
          )}
          {!loading && items.length === 0 && (
            <div className="p-12 text-center">
              <div className="text-3xl mb-2 opacity-80">✨</div>
              <p className={`font-bold ${title}`}>You’re all caught up</p>
              <p className={`text-sm mt-1 ${muted}`}>
                New outlet submissions will show up here.
              </p>
            </div>
          )}
          {!loading &&
            items.map((n) => {
              const meta = typeMeta(n.type);
              return (
                <div
                  key={n._id}
                  className={`group flex gap-3 px-4 py-3.5 transition ${
                    n.read
                      ? dark
                        ? 'hover:bg-slate-800/40'
                        : 'hover:bg-slate-50'
                      : dark
                      ? 'bg-[#3F258B]/10 hover:bg-[#3F258B]/15'
                      : 'bg-sky-50/80 hover:bg-sky-50'
                  }`}
                >
                  {/* Icon */}
                  <div
                    className={`shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center text-base ${meta.bg}`}
                    style={{ color: metap.accent }}
                  >
                    {meta.icon}
                  </div>

                  {/* Body */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {!n.read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#3F258B] shrink-0" />
                          )}
                          <span className={`font-bold text-sm leading-snug ${title}`}>
                            {n.title}
                          </span>
                          <span
                            className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md"
                            style={{
                              color: metap.accent,
                              background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                            }}
                          >
                            {metap.label}
                          </span>
                        </div>
                        <p
                          className={`text-sm mt-0.5 leading-relaxed ${
                            dark ? 'text-slate-300' : 'text-slate-600'
                          }`}
                        >
                          {n.message}
                        </p>
                      </div>
                      <time className={`text-[11px] whitespace-nowrap shrink-0 pt-0.5 ${muted}`}>
                        {timeAgo(n.createdAt)}
                      </time>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mt-2">
                      {!n.read && (
                        <button
                          type="button"
                          onClick={() => mark(n._id)}
                          className="text-[11px] font-bold text-[#3F258B] hover:underline"
                        >
                          Mark read
                        </button>
                      )}
                      {n.type === 'outlet_pending' && (
                        <Link
                          to="/admin/outlets"
                          className="text-[11px] font-bold text-amber-600 hover:underline"
                        >
                          Review outlets →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      <p className={`text-center text-[11px] ${muted}`}>
        Tip: Clear read notifications to keep this inbox light. Pending outlet alerts stay useful
        until you process them under Outlets & Beats.
      </p>
    </div>
  );
}
