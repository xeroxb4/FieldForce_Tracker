import { useEffect, useState, useMemo } from 'react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

function flattenProducts(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.products)) return data.products;
  return Object.values(data)
    .filter((v) => Array.isArray(v))
    .flat();
}

export default function DeferredSales() {
  const { dark } = useTheme();
  const [list, setList] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);
  const [lines, setLines] = useState([]);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [productId, setProductId] = useState('');
  const [qty, setQty] = useState(1);
  const [unit, setUnit] = useState('pc');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category).filter(Boolean));
    return [...set].sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!category) return products;
    return products.filter((p) => p.category === category);
  }, [products, category]);

  const load = () => {
    setLoading(true);
    api
      .get('/omr/deferred-sales')
      .then((r) => setList(r.data || []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    api
      .get('/omr/products')
      .then((r) => setProducts(flattenProducts(r.data)))
      .catch(() => setProducts([]));
  }, []);

  const addLine = () => {
    const prod = products.find((p) => String(p._id) === String(productId));
    if (!prod) {
      setMsg('Select a product first');
      return;
    }
    const q = Number(qty) || 0;
    if (q < 1) {
      setMsg('Enter quantity');
      return;
    }
    let up = Number(prod.pricePc || prod.price || 0);
    if (unit === 'pack') up = Number(prod.pricePack || up);
    if (unit === 'carton') up = Number(prod.priceCarton || up);
    setLines((prev) => [
      ...prev,
      {
        productName: prod.name || prod.productName,
        skuId: prod._id,
        category: prod.category || '',
        unit,
        quantity: q,
        unitPrice: up,
        lineTotal: Math.round(up * q * 100) / 100,
      },
    ]);
    setMsg('');
  };

  const save = async (row) => {
    setSaving(true);
    setMsg('');
    try {
      const { data } = await api.post('/omr/deferred-sales/complete', {
        coverageVisitId: row._id,
        outletId: row.outletId,
        shopName: row.shopName,
        lineItems: lines.length ? lines : undefined,
        amount: lines.length ? undefined : Number(amount) || 0,
        paymentType: 'cash',
      });
      setMsg(data?.message || 'Saved.');
      setActive(null);
      setLines([]);
      setAmount('');
      load();
    } catch (e) {
      setMsg(e.response?.data?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const card = dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200';
  const label = dark ? 'text-white' : 'text-slate-900';
  const input = dark
    ? 'w-full rounded-xl border border-slate-600 bg-slate-800 text-white px-3 py-2 text-sm'
    : 'w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900';

  return (
    <div className="space-y-4 pb-6">
      <div>
        <h1 className={`text-lg font-extrabold ${label}`}>Deferred sales</h1>
        <p className={`text-sm ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
          Enter the order once (even off-beat). Cloud holds it and posts KPIs on the outlet beat
          day — no second Start Visit required that day.
        </p>
      </div>

      <div
        className={`rounded-xl border px-3 py-2 text-xs leading-relaxed ${
          dark ? 'border-slate-600 bg-slate-800 text-slate-300' : 'border-sky-200 bg-sky-50 text-slate-800'
        }`}
      >
        <span className="font-bold">Kofi example:</span> Monday customer calls on Friday → Extra
        coverage + enter products Friday → scheduled for Monday. On Monday the sale appears in KPIs
        automatically. Kofi does <b>not</b> need to Start Visit again for that same order.
      </div>

      {msg && (
        <p
          className={`text-sm font-medium ${
            String(msg).toLowerCase().includes('fail') || String(msg).toLowerCase().includes('cannot')
              ? 'text-amber-500'
              : 'text-emerald-500'
          }`}
        >
          {msg}
        </p>
      )}
      {loading && <p className="text-sm text-slate-500">Loading…</p>}
      {!loading && !list.length && (
        <p className={`text-sm ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
          No pending deferred sales.
        </p>
      )}
      {list.map((row) => (
        <div key={row._id} className={`rounded-2xl border p-3 ${card}`}>
          <div className={`font-bold text-sm ${label}`}>{row.shopName}</div>
          <div className="text-xs opacity-70 mt-0.5">
            Coverage: {row.date} · Beat: <b>{row.beatDayLabels || '—'}</b>
            {row.scheduledKpiDate ? (
              <>
                {' '}
                · KPI date: <b>{row.scheduledKpiDate}</b>
              </>
            ) : null}
          </div>
          {row.deferredStatus === 'scheduled' && (
            <div className="mt-1 text-xs font-semibold text-emerald-500">
              Order held in cloud (GHS {row.heldAmount || 0}
              {row.heldLines ? ` · ${row.heldLines} line(s)` : ''}) — auto-posts on KPI date. No
              second Start Visit needed.
            </div>
          )}
          {row.deferredStatus === 'pending_capture' && (
            <div className="mt-1 text-xs font-semibold text-amber-500">
              Coverage only — enter products below to schedule the sale.
            </div>
          )}

          {active === row._id ? (
            <div className="mt-2 space-y-2">
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setProductId('');
                }}
                className={input}
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className={input}
              >
                <option value="">
                  {products.length ? 'Select product…' : 'No products loaded'}
                </option>
                {filteredProducts.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name || p.productName}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-3 gap-1">
                <select value={unit} onChange={(e) => setUnit(e.target.value)} className={input}>
                  <option value="pc">PC</option>
                  <option value="pack">Pack</option>
                  <option value="carton">Carton</option>
                </select>
                <input
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  className={input}
                />
                <button
                  type="button"
                  onClick={addLine}
                  className="rounded-xl bg-[#117ea6] text-white font-bold text-sm"
                >
                  Add
                </button>
              </div>
              {lines.map((l, i) => (
                <div key={i} className="text-xs flex justify-between gap-2">
                  <span>
                    {l.productName} × {l.quantity} ({l.unit})
                  </span>
                  <span className="font-bold">GHS {l.lineTotal}</span>
                </div>
              ))}
              {!lines.length && (
                <input
                  type="number"
                  placeholder="Or enter total GHS only"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={input}
                />
              )}
              <button
                type="button"
                disabled={saving}
                onClick={() => save(row)}
                className="w-full py-2.5 rounded-xl bg-[#2596be] text-white font-bold text-sm disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save order to cloud (schedule KPI day)'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setActive(row._id);
                setLines([]);
                setAmount(row.deferredAmount ? String(row.deferredAmount) : '');
                setProductId('');
                setCategory('');
                setMsg('');
              }}
              className="mt-2 w-full py-2 rounded-xl bg-amber-500/20 text-amber-600 font-bold text-xs"
            >
              {row.deferredStatus === 'scheduled' ? 'Update held order' : 'Enter order (schedule)'}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
