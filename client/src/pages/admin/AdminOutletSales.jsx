import { useEffect, useState } from 'react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

export default function AdminOutletSales() {
  const { dark } = useTheme();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = () => {
    setLoading(true);
    api
      .get('/admin/outlet-sales-history')
      .then((r) => setRows(r.data?.outlets || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = rows.filter((r) =>
    (r.shopName || '').toLowerCase().includes(q.toLowerCase())
  );

  const deleteVisit = async (visitId, e) => {
    e.stopPropagation();
    if (!visitId) return alert('This row has no id — refresh after server update');
    if (!window.confirm('Delete this visit/order permanently? This cannot be undone.')) return;
    setBusyId(visitId);
    try {
      await api.delete(`/admin/visits/${visitId}`);
      load();
      setSelected(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className={`text-xl font-extrabold ${dark ? 'text-white' : 'text-slate-900'}`}>
          Outlet sales history
        </h1>
        <p className={`text-sm ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
          Performance by shop — visits, orders, total sales. Delete duplicates if needed.
        </p>
      </div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search shop…"
        className={`w-full rounded-xl px-4 py-2.5 text-sm border ${
          dark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200'
        }`}
      />
      {loading && <p className="text-sm text-slate-500">Loading…</p>}
      <div className="space-y-2">
        {filtered.map((r) => (
          <button
            key={r.outletId || r.shopName}
            type="button"
            onClick={() => setSelected(selected?.shopName === r.shopName ? null : r)}
            className={`w-full text-left rounded-2xl border p-4 ${
              dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex justify-between gap-2">
              <div className={`font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>{r.shopName}</div>
              <div className="text-sm font-extrabold text-[#2596be]">
                GHS {Number(r.totalSales || 0).toFixed(2)}
              </div>
            </div>
            <div className={`text-xs mt-1 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
              {r.visits} visits · {r.orders} orders · last {r.lastVisit || '—'}
            </div>
            {selected?.shopName === r.shopName && (
              <div className="mt-3 space-y-2 border-t border-slate-700/30 pt-2">
                {(r.history || []).map((h, i) => (
                  <div
                    key={h._id || i}
                    className={`text-xs flex justify-between items-center gap-2 ${
                      dark ? 'text-slate-300' : 'text-slate-700'
                    }`}
                  >
                    <span className="min-w-0">
                      {h.date} · {h.outcome} · {h.rep}
                    </span>
                    <span className="font-semibold shrink-0">
                      GHS {Number(h.amount || 0).toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => deleteVisit(h._id, e)}
                      disabled={busyId === h._id}
                      className="shrink-0 text-[10px] font-bold px-2 py-1 rounded-lg bg-red-500/15 text-red-400 border border-red-500/30"
                    >
                      {busyId === h._id ? '…' : 'Delete'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
