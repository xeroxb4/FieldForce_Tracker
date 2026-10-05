import { useEffect, useState, useMemo } from 'react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { usePremium, PremiumHero } from '../../lib/premium';

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
  const p = usePremium(dark);
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
    const set = new Set(products.map((prod) => prod.category).filter(Boolean));
    return [...set].sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!category) return products;
    return products.filter((prod) => prod.category === category);
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
    const prod = products.find((pr) => String(pr._id) === String(productId));
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

  const pending = list.filter((r) => r.deferredStatus === 'pending_capture').length;
  const scheduled = list.filter((r) => r.deferredStatus === 'scheduled').length;

  return (
    <div className={`-mx-4 -mt-2 px-4 pb-12 min-h-[70vh] ${p.shell}`}>
      <PremiumHero
        dark={dark}
        eyebrow="Order pipeline"
        title="Deferred Sales"
        subtitle="Capture once — KPIs post on the outlet beat day automatically"
      >
        {(pending > 0 || scheduled > 0) && (
          <div className="mt-4 flex gap-3">
            <div className="rounded-xl px-3 py-2 bg-white/10 backdrop-blur">
              <p className="text-[9px] font-black uppercase tracking-wider text-violet-200/80">Pending</p>
              <p className="text-lg font-black">{pending}</p>
            </div>
            <div className="rounded-xl px-3 py-2 bg-white/10 backdrop-blur">
              <p className="text-[9px] font-black uppercase tracking-wider text-violet-200/80">Scheduled</p>
              <p className="text-lg font-black">{scheduled}</p>
            </div>
          </div>
        )}
      </PremiumHero>

      <div
        className={`rounded-[1.35rem] px-4 py-3.5 mb-5 text-xs leading-relaxed border ${
          dark
            ? 'border-violet-500/25 bg-violet-950/40 text-violet-100'
            : 'border-violet-200 bg-violet-50 text-slate-800'
        }`}
      >
        <span className="font-black text-[#3F258B] dark:text-violet-300">How it works: </span>
        Customer calls off-beat → Extra coverage + enter products → scheduled for their beat day.
        On that day the sale appears in KPIs automatically — no second Start Visit needed.
      </div>

      {msg && (
        <div
          className={`mb-4 text-sm px-4 py-3 rounded-2xl border font-semibold ${
            String(msg).toLowerCase().includes('fail') || String(msg).toLowerCase().includes('cannot')
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}
        >
          {msg}
        </div>
      )}

      {loading && (
        <div className={`rounded-[1.5rem] p-8 text-center ${p.glass}`}>
          <div className="w-8 h-8 mx-auto rounded-full border-2 border-[#3F258B] border-t-transparent animate-spin" />
          <p className={`text-sm mt-3 font-medium ${p.muted}`}>Loading deferred sales…</p>
        </div>
      )}

      {!loading && !list.length && (
        <div className={`rounded-[1.5rem] p-8 text-center ${p.glass}`}>
          <p className="text-3xl mb-2">📋</p>
          <p className={`text-sm font-semibold ${p.title}`}>No pending deferred sales</p>
          <p className={`text-xs mt-1 ${p.soft}`}>Coverage visits awaiting order capture will appear here</p>
        </div>
      )}

      <div className="space-y-3">
        {list.map((row) => (
          <div key={row._id} className={`rounded-[1.35rem] p-5 ${p.glass}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className={`font-bold text-sm ${p.title}`}>{row.shopName}</p>
                <p className={`text-[11px] mt-1 ${p.soft}`}>
                  Coverage: {row.date} · Beat: <b className={p.muted}>{row.beatDayLabels || '—'}</b>
                  {row.scheduledKpiDate ? (
                    <>
                      {' '}
                      · KPI: <b className={p.muted}>{row.scheduledKpiDate}</b>
                    </>
                  ) : null}
                </p>
              </div>
              <span
                className={`shrink-0 text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-lg ${
                  row.deferredStatus === 'scheduled'
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-amber-500/15 text-amber-500'
                }`}
              >
                {row.deferredStatus === 'scheduled' ? 'Held' : 'Capture'}
              </span>
            </div>

            {row.deferredStatus === 'scheduled' && (
              <p className="mt-2 text-xs font-semibold text-emerald-500">
                Order held (GHS {row.heldAmount || 0}
                {row.heldLines ? ` · ${row.heldLines} line(s)` : ''}) — auto-posts on KPI date
              </p>
            )}
            {row.deferredStatus === 'pending_capture' && (
              <p className="mt-2 text-xs font-semibold text-amber-500">
                Coverage only — enter products below to schedule the sale
              </p>
            )}

            {active === row._id ? (
              <div className="mt-4 space-y-3">
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setProductId('');
                  }}
                  className={p.input}
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
                  className={p.input}
                >
                  <option value="">
                    {products.length ? 'Select product…' : 'No products loaded'}
                  </option>
                  {filteredProducts.map((pr) => (
                    <option key={pr._id} value={pr._id}>
                      {pr.name || pr.productName}
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-3 gap-2">
                  <select value={unit} onChange={(e) => setUnit(e.target.value)} className={p.input}>
                    <option value="pc">PC</option>
                    <option value="pack">Pack</option>
                    <option value="carton">Carton</option>
                  </select>
                  <input
                    type="number"
                    min={1}
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    className={p.input}
                  />
                  <button
                    type="button"
                    onClick={addLine}
                    className="rounded-2xl font-black text-sm text-white"
                    style={{
                      background: 'linear-gradient(135deg, #5b3aad, #3F258B)',
                      boxShadow: '0 8px 20px rgba(63,37,139,0.3)',
                    }}
                  >
                    Add
                  </button>
                </div>
                {lines.map((l, i) => (
                  <div
                    key={i}
                    className={`text-xs flex justify-between gap-2 rounded-xl px-3 py-2 ${
                      dark ? 'bg-slate-950/70' : 'bg-violet-50'
                    }`}
                  >
                    <span className={p.muted}>
                      {l.productName} × {l.quantity} ({l.unit})
                    </span>
                    <span className={`font-bold ${p.title}`}>GHS {l.lineTotal}</span>
                  </div>
                ))}
                {!lines.length && (
                  <input
                    type="number"
                    placeholder="Or enter total GHS only"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={p.input}
                  />
                )}
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => save(row)}
                  className={`w-full ${p.btnPrimary}`}
                  style={p.btnPrimaryStyle}
                >
                  {saving ? 'Saving…' : 'Save order to cloud'}
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
                className="mt-3 w-full py-3 rounded-2xl font-black text-xs tracking-wide"
                style={{
                  background: row.deferredStatus === 'scheduled'
                    ? dark
                      ? 'rgba(16,185,129,0.15)'
                      : 'rgba(16,185,129,0.12)'
                    : dark
                    ? 'rgba(245,158,11,0.15)'
                    : 'rgba(245,158,11,0.12)',
                  color: row.deferredStatus === 'scheduled' ? '#34d399' : '#f59e0b',
                }}
              >
                {row.deferredStatus === 'scheduled' ? 'Update held order' : 'Enter order (schedule)'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
