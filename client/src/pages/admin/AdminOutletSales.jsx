import { useEffect, useState } from 'react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

export default function AdminOutletSales() {
  const { dark } = useTheme();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api
      .get('/admin/outlet-sales-history')
      .then((r) => setRows(r.data?.outlets || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = rows.filter((r) =>
    (r.shopName || '').toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className={`text-xl font-extrabold ${dark ? 'text-white' : 'text-slate-900'}`}>
          Outlet sales history
        </h1>
        <p className={`text-sm ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
          Performance by shop — visits, orders, total sales
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
              <div className="mt-3 space-y-1 border-t border-slate-700/30 pt-2">
                {(r.history || []).slice(0, 20).map((h, i) => (
                  <div key={i} className={`text-xs flex justify-between ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
                    <span>
                      {h.date} · {h.outcome} · {h.rep}
                    </span>
                    <span className="font-semibold">GHS {Number(h.amount || 0).toFixed(2)}</span>
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
