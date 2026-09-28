import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

export default function AdminNotifications() {
  const { dark } = useTheme();
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [total, setTotal] = useState(0);

  const load = () => {
    api.get('/admin/notifications').then((r) => {
      setItems(r.data.notifications || []);
      setUnread(r.data.unread || 0);
      setTotal(r.data.total ?? (r.data.notifications || []).length);
    });
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
    if (!window.confirm('Delete all read notifications? Unread will stay.')) return;
    try {
      await api.delete('/admin/notifications/read');
      load();
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to clear');
    }
  };

  const card = (n) =>
    n.read
      ? dark
        ? 'bg-slate-900 border-slate-700'
        : 'bg-white border-slate-200'
      : dark
      ? 'bg-slate-800 border-[#2596be]'
      : 'bg-sky-50 border-[#2596be]';

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className={`text-xl font-extrabold ${dark ? 'text-white' : 'text-slate-900'}`}>
            Notifications
          </h1>
          <p className={`text-sm ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
            {unread} unread
            {total ? ` · ${total} total` : ''} · outlet approvals and system alerts
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={markAll}
            className="text-xs font-bold px-3 py-2 rounded-xl bg-[#2596be] text-white"
          >
            Mark all read
          </button>
          <button
            type="button"
            onClick={clearRead}
            className={`text-xs font-bold px-3 py-2 rounded-xl border ${
              dark ? 'border-slate-600 text-slate-300' : 'border-slate-300 text-slate-700'
            }`}
          >
            Clear read
          </button>
        </div>
      </div>

      {/* Fixed-height panel so the page does not keep growing */}
      <div
        className={`rounded-2xl border-2 overflow-hidden ${
          dark ? 'border-slate-700 bg-slate-950/50' : 'border-slate-200 bg-slate-50'
        }`}
      >
        <div className="max-h-[min(70vh,560px)] overflow-y-auto overscroll-contain p-2 space-y-2">
          {items.length === 0 && (
            <p className="text-sm text-slate-500 p-3">No notifications yet.</p>
          )}
          {items.map((n) => (
            <div key={n._id} className={`rounded-xl border-2 p-3 ${card(n)}`}>
              <div className={`font-bold text-sm ${dark ? 'text-white' : 'text-slate-900'}`}>
                {n.title}
              </div>
              <div className={`text-xs mt-1 ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
                {n.message}
              </div>
              {n.createdAt && (
                <div className={`text-[10px] mt-1 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
                  {new Date(n.createdAt).toLocaleString()}
                </div>
              )}
              <div className="flex gap-2 mt-2">
                {!n.read && (
                  <button
                    type="button"
                    onClick={() => mark(n._id)}
                    className="text-xs font-bold text-[#2596be]"
                  >
                    Mark read
                  </button>
                )}
                {n.type === 'outlet_pending' && (
                  <Link to="/admin/outlets" className="text-xs font-bold text-amber-600">
                    Review outlets →
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className={`text-[11px] ${dark ? 'text-slate-500' : 'text-slate-500'}`}>
        Showing latest {items.length} notifications. Scroll inside the box above. Use “Clear read”
        to shorten the list.
      </p>
    </div>
  );
}
