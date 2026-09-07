import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

export default function AdminNotifications() {
  const { dark } = useTheme();
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);

  const load = () => {
    api.get('/admin/notifications').then((r) => {
      setItems(r.data.notifications || []);
      setUnread(r.data.unread || 0);
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className={`text-xl font-extrabold ${dark ? 'text-white' : 'text-slate-900'}`}>
            Notifications
          </h1>
          <p className={`text-sm ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
            {unread} unread · outlet approvals and system alerts
          </p>
        </div>
        <button type="button" onClick={markAll} className="text-xs font-bold px-3 py-2 rounded-xl bg-[#2596be] text-white">
          Mark all read
        </button>
      </div>

      <div className="space-y-2">
        {items.length === 0 && (
          <p className="text-sm text-slate-500">No notifications yet.</p>
        )}
        {items.map((n) => (
          <div
            key={n._id}
            className={`rounded-2xl border-2 p-4 ${
              n.read
                ? dark
                  ? 'bg-slate-900 border-slate-700'
                  : 'bg-white border-slate-200'
                : dark
                ? 'bg-slate-800 border-[#2596be]'
                : 'bg-sky-50 border-[#2596be]'
            }`}
          >
            <div className={`font-bold text-sm ${dark ? 'text-white' : 'text-slate-900'}`}>{n.title}</div>
            <div className={`text-xs mt-1 ${dark ? 'text-slate-400' : 'text-slate-600'}`}>{n.message}</div>
            <div className="flex gap-2 mt-2">
              {!n.read && (
                <button type="button" onClick={() => mark(n._id)} className="text-xs font-bold text-[#2596be]">
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
  );
}
