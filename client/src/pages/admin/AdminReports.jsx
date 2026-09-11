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
  const [editId, setEditId] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const [editProducts, setEditProducts] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [productsCatalog, setProductsCatalog] = useState([]);
  const [pickProduct, setPickProduct] = useState('');
  const [pickQty, setPickQty] = useState(1);
  const [pickUnit, setPickUnit] = useState('pc');
  const [editLines, setEditLines] = useState([]);

  useEffect(() => {
    api
      .get('/admin/users?role=omr')
      .then((r) => setOmrs(r.data || []))
      .catch(() => {});
    api
      .get('/admin/products')
      .then((r) => {
        const d = r.data;
        setProductsCatalog(Array.isArray(d) ? d : d?.products || []);
      })
      .catch(() => {});
  }, []);

  const startEdit = (v) => {
    setEditId(v._id);
    setOpenId(v._id);
    setEditAmount(v.amount > 0 ? String(v.amount) : '');
    setEditProducts(v.products || '');
    setEditLines(Array.isArray(v.lineItems) ? [...v.lineItems] : []);
  };

  const addEditLine = () => {
    const prod = productsCatalog.find((p) => String(p._id) === String(pickProduct));
    if (!prod) return alert('Select product');
    const q = Number(pickQty) || 0;
    if (q <= 0) return;
    let up = Number(prod.pricePc || prod.price || prod.unitPrice || 0);
    if (pickUnit === 'pack') up = Number(prod.pricePack || prod.packPrice || up);
    if (pickUnit === 'carton') up = Number(prod.priceCarton || prod.cartonPrice || up);
    const lineTotal = Math.round(up * q * 100) / 100;
    setEditLines((prev) => [
      ...prev,
      {
        skuId: prod._id,
        productName: prod.name || prod.productName,
        unit: pickUnit,
        quantity: q,
        unitPrice: up,
        lineTotal,
      },
    ]);
  };

  const saveEdit = async (visitId) => {
    setEditSaving(true);
    try {
      const body =
        editLines.length > 0
          ? { lineItems: editLines, outcome: 'Order Placed', paymentType: 'cash' }
          : {
              amount: Number(editAmount) || 0,
              products: editProducts,
              outcome: 'Order Placed',
              paymentType: 'cash',
            };
      await api.put(`/admin/visits/${visitId}`, body);
      setEditId(null);
      await loadReports();
    } catch (e) {
      alert(e.response?.data?.message || 'Save failed');
    } finally {
      setEditSaving(false);
    }
  };

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
                        <div className={`mt-2 pt-2 border-t text-xs space-y-2 ${dark ? 'border-slate-700' : 'border-slate-200'}`}>
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
                            <p className={muted}>No SKU lines / amount from old app — enter below.</p>
                          )}
                          {v.noOrderReason && (
                            <p className={`mt-1 ${muted}`}>Reason: {v.noOrderReason}</p>
                          )}

                          {editId !== id ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                startEdit(v);
                              }}
                              className="w-full py-2 rounded-lg bg-amber-500/20 text-amber-400 font-bold text-xs"
                            >
                              Enter / edit sale (amount & SKUs)
                            </button>
                          ) : (
                            <div
                              className={`rounded-xl p-2 space-y-2 ${dark ? 'bg-slate-900' : 'bg-white border'}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className={`text-xs font-bold ${label}`}>Complete this visit from invoice</div>
                              <select
                                value={pickProduct}
                                onChange={(e) => setPickProduct(e.target.value)}
                                className={input}
                              >
                                <option value="">Add product…</option>
                                {productsCatalog.map((p) => (
                                  <option key={p._id} value={p._id}>
                                    {p.name || p.productName}
                                  </option>
                                ))}
                              </select>
                              <div className="grid grid-cols-3 gap-1">
                                <select value={pickUnit} onChange={(e) => setPickUnit(e.target.value)} className={input}>
                                  <option value="pc">PC</option>
                                  <option value="pack">Pack</option>
                                  <option value="carton">Carton</option>
                                </select>
                                <input
                                  type="number"
                                  min={1}
                                  value={pickQty}
                                  onChange={(e) => setPickQty(e.target.value)}
                                  className={input}
                                />
                                <button type="button" onClick={addEditLine} className="rounded-lg bg-[#2596be]/20 text-[#2596be] font-bold">
                                  Add
                                </button>
                              </div>
                              {editLines.map((l, i) => (
                                <div key={i} className={`flex justify-between ${label}`}>
                                  <span>
                                    {l.productName} × {l.quantity}
                                  </span>
                                  <span>
                                    GHS {l.lineTotal}
                                    <button
                                      type="button"
                                      className="ml-2 text-red-400"
                                      onClick={() => setEditLines((prev) => prev.filter((_, j) => j !== i))}
                                    >
                                      ✕
                                    </button>
                                  </span>
                                </div>
                              ))}
                              {!editLines.length && (
                                <>
                                  <input
                                    type="number"
                                    step="0.01"
                                    placeholder="Total GHS only"
                                    value={editAmount}
                                    onChange={(e) => setEditAmount(e.target.value)}
                                    className={input}
                                  />
                                  <textarea
                                    placeholder="Product text from invoice (optional)"
                                    value={editProducts}
                                    onChange={(e) => setEditProducts(e.target.value)}
                                    className={input}
                                    rows={2}
                                  />
                                </>
                              )}
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => setEditId(null)}
                                  className="py-2 rounded-lg border font-bold"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  disabled={editSaving}
                                  onClick={() => saveEdit(id)}
                                  className="py-2 rounded-lg bg-[#2596be] text-white font-bold disabled:opacity-60"
                                >
                                  {editSaving ? 'Saving…' : 'Save sale'}
                                </button>
                              </div>
                            </div>
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
