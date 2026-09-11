import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

function presetRange(type) {
  const today = new Date();
  const end = today.toISOString().slice(0, 10);
  if (type === 'today') return { start: end, end };
  if (type === 'week') {
    const d = new Date(today);
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1);
    return { start: d.toISOString().slice(0, 10), end };
  }
  if (type === 'month') {
    const start = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
    return { start, end };
  }
  return { start: end, end };
}

export default function AdminReports() {
  const { dark } = useTheme();
  const month = presetRange('month');
  const [startDate, setStartDate] = useState(month.start);
  const [endDate, setEndDate] = useState(month.end);
  const [repName, setRepName] = useState('');
  const [territory, setTerritory] = useState('');
  const [distributor, setDistributor] = useState('');
  const [omrs, setOmrs] = useState([]);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    api
      .get('/admin/users?role=omr')
      .then((r) => setOmrs(r.data || []))
      .catch(() => {});
  }, []);

  const distributors = useMemo(() => {
    const s = new Set(omrs.map((u) => u.distributor).filter(Boolean));
    return [...s].sort();
  }, [omrs]);

  const loadReports = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ startDate, endDate });
      if (repName) params.set('repName', repName);
      if (territory) params.set('territory', territory);
      if (distributor) params.set('distributor', distributor);

      const vRes = await api.get(`/admin/reports/visits?${params}`);
      setVisits(Array.isArray(vRes.data) ? vRes.data : []);
      setLoaded(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const totals = useMemo(() => {
    let sales = 0;
    let orders = 0;
    const outlets = new Set();
    for (const v of visits) {
      if ((v.amount || 0) > 0 || v.outcome === 'Order Placed') {
        orders += 1;
        sales += Number(v.amount) || 0;
      }
      outlets.add(v.shopName || String(v.outletId));
    }
    return {
      visits: visits.length,
      orders,
      sales: Math.round(sales * 100) / 100,
      outlets: outlets.size,
    };
  }, [visits]);

  // Group by OMR then shop
  const byOmr = useMemo(() => {
    const map = {};
    for (const v of visits) {
      const rep = v.repName || v.userId?.fullName || 'Unknown';
      if (!map[rep]) map[rep] = { visits: [], sales: 0, orders: 0 };
      map[rep].visits.push(v);
      if ((v.amount || 0) > 0 || v.outcome === 'Order Placed') {
        map[rep].orders += 1;
        map[rep].sales += Number(v.amount) || 0;
      }
    }
    return Object.entries(map).sort((a, b) => b[1].sales - a[1].sales);
  }, [visits]);

  const label = dark ? 'text-slate-200' : 'text-slate-800';
  const muted = dark ? 'text-slate-400' : 'text-slate-600';
  const input = dark
    ? 'w-full rounded-xl border border-slate-600 bg-slate-900 text-white px-3 py-2.5 text-sm'
    : 'w-full rounded-xl border border-slate-300 bg-white text-slate-900 px-3 py-2.5 text-sm';
  const card = dark
    ? 'rounded-2xl border border-slate-700 bg-slate-900 p-4'
    : 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm';

  return (
    <div className="space-y-4">
      <div>
        <h2 className={`text-xl font-extrabold ${dark ? 'text-white' : 'text-slate-900'}`}>
          OMR sales reports
        </h2>
        <p className={`text-sm font-medium ${muted}`}>
          Date range · outlets · SKUs · totals by rep
        </p>
      </div>

      <div className={card}>
        <div className="flex flex-wrap gap-2 mb-3">
          {['today', 'week', 'month'].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                const r = presetRange(p);
                setStartDate(r.start);
                setEndDate(r.end);
              }}
              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-[#2596be]/20 text-[#2596be]"
            >
              {p}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className={`block text-xs font-bold mb-1 ${label}`}>From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={input}
            />
          </div>
          <div>
            <label className={`block text-xs font-bold mb-1 ${label}`}>To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={input}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div>
            <label className={`block text-xs font-bold mb-1 ${label}`}>OMR</label>
            <select
              value={repName}
              onChange={(e) => setRepName(e.target.value)}
              className={input}
            >
              <option value="">All OMRs</option>
              {omrs.map((u) => (
                <option key={u._id} value={u.fullName}>
                  {u.fullName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={`block text-xs font-bold mb-1 ${label}`}>Distributor</label>
            <select
              value={distributor}
              onChange={(e) => setDistributor(e.target.value)}
              className={input}
            >
              <option value="">All distributors</option>
              {distributors.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={`block text-xs font-bold mb-1 ${label}`}>Territory</label>
            <input
              value={territory}
              onChange={(e) => setTerritory(e.target.value)}
              placeholder="Optional"
              className={input}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={loadReports}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-[#2596be] text-white font-bold text-sm disabled:opacity-60"
        >
          {loading ? 'Loading…' : 'Load sales data'}
        </button>
        {error && <p className="text-sm text-red-500 mt-2 font-medium">{error}</p>}
      </div>

      {loaded && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              ['Visits', totals.visits],
              ['Orders', totals.orders],
              ['Outlets', totals.outlets],
              ['Sales GHS', totals.sales.toLocaleString()],
            ].map(([k, v]) => (
              <div key={k} className={card}>
                <div className={`text-lg font-extrabold text-[#2596be]`}>{v}</div>
                <div className={`text-xs font-semibold ${muted}`}>{k}</div>
              </div>
            ))}
          </div>

          {byOmr.map(([rep, data]) => (
            <div key={rep} className={card}>
              <div className="flex justify-between gap-2 mb-3">
                <div>
                  <div className={`font-extrabold ${dark ? 'text-white' : 'text-slate-900'}`}>{rep}</div>
                  <div className={`text-xs ${muted}`}>
                    {data.visits.length} visits · {data.orders} orders
                  </div>
                </div>
                <div className="text-right font-extrabold text-[#2596be]">
                  GHS {data.sales.toLocaleString()}
                </div>
              </div>

              <div className="space-y-2">
                {data.visits.map((v) => {
                  const id = v._id;
                  const lines = v.lineItems || [];
                  const open = openId === id;
                  return (
                    <div
                      key={id}
                      className={`rounded-xl border p-3 ${
                        dark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50'
                      }`}
                    >
                      <button
                        type="button"
                        className="w-full text-left"
                        onClick={() => setOpenId(open ? null : id)}
                      >
                        <div className="flex justify-between gap-2">
                          <div>
                            <div className={`text-sm font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>
                              {v.shopName}
                            </div>
                            <div className={`text-[11px] ${muted}`}>
                              {v.date} · {v.outcome}
                              {v.paymentType ? ` · ${v.paymentType}` : ''}
                            </div>
                          </div>
                          <div className="text-sm font-bold text-[#2596be]">
                            GHS {Number(v.amount || 0).toLocaleString()}
                          </div>
                        </div>
                      </button>
                      {open && (
                        <div className={`mt-2 pt-2 border-t text-xs ${dark ? 'border-slate-700' : 'border-slate-200'}`}>
                          {lines.length > 0 ? (
                            <ul className="space-y-1">
                              {lines.map((li, i) => (
                                <li key={i} className={`flex justify-between ${label}`}>
                                  <span>
                                    {li.productName || li.name} × {li.quantity} {li.unit || 'pc'}
                                  </span>
                                  <span className="font-semibold">
                                    GHS {Number(li.lineTotal || 0).toLocaleString()}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          ) : v.products ? (
                            <p className={label}>{v.products}</p>
                          ) : (
                            <p className={muted}>No SKU lines recorded for this visit.</p>
                          )}
                          {v.noOrderReason && (
                            <p className={`mt-1 ${muted}`}>Reason: {v.noOrderReason}</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {!visits.length && (
            <p className={`text-sm font-medium ${muted}`}>No visits in this date range / filter.</p>
          )}
        </>
      )}
    </div>
  );
}
