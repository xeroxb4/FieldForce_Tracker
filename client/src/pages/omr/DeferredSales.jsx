import { useEffect, useState } from 'react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

export default function DeferredSales() {
  const { dark } = useTheme();
  const [list, setList] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);
  const [lines, setLines] = useState([]);
  const [amount, setAmount] = useState('');
  const [productId, setProductId] = useState('');
  const [qty, setQty] = useState(1);
  const [unit, setUnit] = useState('pc');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

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
    api.get('/omr/products').then((r) => {
      const d = r.data;
      setProducts(Array.isArray(d) ? d : d?.products || []);
    }).catch(() => {});
  }, []);

  const addLine = () => {
    const prod = products.find((p) => String(p._id) === String(productId));
    if (!prod) return;
    const q = Number(qty) || 0;
    let up = Number(prod.pricePc || prod.price || 0);
    if (unit === 'pack') up = Number(prod.pricePack || up);
    if (unit === 'carton') up = Number(prod.priceCarton || up);
    setLines((prev) => [
      ...prev,
      {
        productName: prod.name || prod.productName,
        skuId: prod._id,
        unit,
        quantity: q,
        unitPrice: up,
        lineTotal: Math.round(up * q * 100) / 100,
      },
    ]);
  };

  const save = async (row) => {
    setSaving(true);
    setMsg('');
    try {
      await api.post('/omr/deferred-sales/complete', {
        coverageVisitId: row._id,
        outletId: row.outletId,
        shopName: row.shopName,
        lineItems: lines.length ? lines : undefined,
        amount: lines.length ? undefined : Number(amount) || 0,
        paymentType: 'cash',
      });
      setMsg('Sale saved on today (beat day) for KPIs.');
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
          Extra coverage done off-beat — enter the sale on the outlet&apos;s beat day (KPIs count today).
        </p>
      </div>
      {msg && <p className="text-sm text-emerald-500 font-medium">{msg}</p>}
      {loading && <p className="text-sm text-slate-500">Loading…</p>}
      {!loading && !list.length && (
        <p className={`text-sm ${dark ? 'text-slate-400' : 'text-slate-500'}`}>No pending deferred sales.</p>
      )}
      {list.map((row) => (
        <div key={row._id} className={`rounded-2xl border p-3 ${card}`}>
          <div className={`font-bold text-sm ${label}`}>{row.shopName}</div>
          <div className="text-xs opacity-60">
            Coverage: {row.date} · physical sale pending KPI entry
          </div>
          {active === row._id ? (
            <div className="mt-2 space-y-2">
              <select value={productId} onChange={(e) => setProductId(e.target.value)} className={input}>
                <option value="">Product…</option>
                {products.map((p) => (
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
                <input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} className={input} />
                <button type="button" onClick={addLine} className="rounded-xl bg-[#2596be]/20 text-[#2596be] font-bold text-sm">
                  Add
                </button>
              </div>
              {lines.map((l, i) => (
                <div key={i} className="text-xs flex justify-between">
                  <span>
                    {l.productName} × {l.quantity}
                  </span>
                  <span>GHS {l.lineTotal}</span>
                </div>
              ))}
              {!lines.length && (
                <input
                  type="number"
                  placeholder="Total GHS"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={input}
                />
              )}
              <button
                type="button"
                disabled={saving}
                onClick={() => save(row)}
                className="w-full py-2.5 rounded-xl bg-[#2596be] text-white font-bold text-sm"
              >
                {saving ? 'Saving…' : 'Save sale for today (KPIs)'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setActive(row._id);
                setLines([]);
                setAmount('');
              }}
              className="mt-2 w-full py-2 rounded-xl bg-amber-500/20 text-amber-600 font-bold text-xs"
            >
              Enter sale (beat day)
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
