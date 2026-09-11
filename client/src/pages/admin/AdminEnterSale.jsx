import { useEffect, useState } from 'react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

export default function AdminEnterSale() {
  const { dark } = useTheme();
  const [omrs, setOmrs] = useState([]);
  const [products, setProducts] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [omrId, setOmrId] = useState('');
  const [outletId, setOutletId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentType, setPaymentType] = useState('cash');
  const [creditWeeks, setCreditWeeks] = useState(1);
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState([]);
  const [manualAmount, setManualAmount] = useState('');
  const [productId, setProductId] = useState('');
  const [qty, setQty] = useState(1);
  const [unit, setUnit] = useState('pc');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/admin/users?role=omr').then((r) => setOmrs(r.data || [])).catch(() => {});
    api.get('/admin/products').then((r) => {
      const d = r.data;
      setProducts(Array.isArray(d) ? d : d?.products || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!omrId) {
      setOutlets([]);
      setOutletId('');
      return;
    }
    api
      .get(`/admin/omr-outlets?omrId=${omrId}`)
      .then((r) => setOutlets(r.data || []))
      .catch(() => setOutlets([]));
  }, [omrId]);

  const selectedProduct = products.find((p) => String(p._id) === String(productId));

  const unitPrice = () => {
    if (!selectedProduct) return 0;
    if (unit === 'carton') return Number(selectedProduct.priceCarton || selectedProduct.cartonPrice || 0);
    if (unit === 'pack') return Number(selectedProduct.pricePack || selectedProduct.packPrice || 0);
    return Number(selectedProduct.pricePc || selectedProduct.price || selectedProduct.unitPrice || 0);
  };

  const addLine = () => {
    if (!selectedProduct) return alert('Select a product');
    const q = Number(qty) || 0;
    if (q <= 0) return alert('Quantity must be > 0');
    const up = unitPrice();
    const lineTotal = Math.round(up * q * 100) / 100;
    setLines((prev) => [
      ...prev,
      {
        skuId: selectedProduct._id,
        productName: selectedProduct.name || selectedProduct.productName,
        category: selectedProduct.category || '',
        unit,
        quantity: q,
        unitPrice: up,
        lineTotal,
      },
    ]);
    setQty(1);
  };

  const total = lines.reduce((s, l) => s + (l.lineTotal || 0), 0) || Number(manualAmount) || 0;

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setMsg('');
    if (!omrId) return setErr('Select OMR');
    if (!outletId && !lines.length && !manualAmount) return setErr('Select outlet and enter products or amount');
    setSaving(true);
    try {
      await api.post('/admin/sales', {
        omrId,
        outletId: outletId || undefined,
        shopName: outlets.find((o) => o._id === outletId)?.name,
        date,
        outcome: 'Order Placed',
        lineItems: lines.length ? lines : undefined,
        amount: lines.length ? undefined : Number(manualAmount) || 0,
        paymentType,
        creditDurationWeeks: paymentType === 'credit' ? Number(creditWeeks) : undefined,
        notes,
      });
      setMsg('Sale saved for OMR. It will show on outlet sales, reports, and targets.');
      setLines([]);
      setManualAmount('');
      setNotes('');
    } catch (ex) {
      setErr(ex.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const label = dark ? 'text-slate-200' : 'text-slate-800';
  const input = dark
    ? 'w-full rounded-xl border border-slate-600 bg-slate-900 text-white px-3 py-2.5 text-sm'
    : 'w-full rounded-xl border border-slate-300 bg-white text-slate-900 px-3 py-2.5 text-sm';
  const card = dark
    ? 'rounded-2xl border border-slate-700 bg-slate-900 p-4'
    : 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm';

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h1 className={`text-xl font-extrabold ${dark ? 'text-white' : 'text-slate-900'}`}>
          Enter sale for OMR
        </h1>
        <p className={`text-sm font-medium ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
          Admin only — post physical / old-app invoices into the correct outlet. OMRs cannot use this.
        </p>
      </div>

      <form onSubmit={submit} className={`space-y-3 ${card}`}>
        <div>
          <label className={`text-xs font-bold ${label}`}>OMR *</label>
          <select value={omrId} onChange={(e) => setOmrId(e.target.value)} className={input} required>
            <option value="">Select OMR…</option>
            {omrs.map((u) => (
              <option key={u._id} value={u._id}>
                {u.fullName} {u.distributor ? `· ${u.distributor}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={`text-xs font-bold ${label}`}>Outlet *</label>
          <select
            value={outletId}
            onChange={(e) => setOutletId(e.target.value)}
            className={input}
            required
            disabled={!omrId}
          >
            <option value="">Select outlet…</option>
            {outlets.map((o) => (
              <option key={o._id} value={o._id}>
                {o.displayName || o.name}
                {o.avcTier ? ` · AVC ${o.avcTier}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={`text-xs font-bold ${label}`}>Sale date *</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={input} required />
        </div>

        <div className={`rounded-xl border p-3 space-y-2 ${dark ? 'border-slate-700' : 'border-slate-200'}`}>
          <div className={`text-xs font-bold ${label}`}>Add product lines (optional)</div>
          <select value={productId} onChange={(e) => setProductId(e.target.value)} className={input}>
            <option value="">Product…</option>
            {products.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name || p.productName}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-3 gap-2">
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
              placeholder="Qty"
            />
            <button type="button" onClick={addLine} className="rounded-xl bg-[#2596be]/20 text-[#2596be] font-bold text-sm">
              Add
            </button>
          </div>
          {lines.map((l, i) => (
            <div key={i} className={`flex justify-between text-xs ${label}`}>
              <span>
                {l.productName} × {l.quantity} {l.unit}
              </span>
              <span className="font-bold">
                GHS {l.lineTotal}
                <button
                  type="button"
                  className="ml-2 text-red-400"
                  onClick={() => setLines((prev) => prev.filter((_, j) => j !== i))}
                >
                  ✕
                </button>
              </span>
            </div>
          ))}
        </div>

        {!lines.length && (
          <div>
            <label className={`text-xs font-bold ${label}`}>Total amount (GHS) if no product lines</label>
            <input
              type="number"
              step="0.01"
              value={manualAmount}
              onChange={(e) => setManualAmount(e.target.value)}
              className={input}
              placeholder="e.g. 6975"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={`text-xs font-bold ${label}`}>Payment</label>
            <select value={paymentType} onChange={(e) => setPaymentType(e.target.value)} className={input}>
              <option value="cash">Cash</option>
              <option value="credit">Credit</option>
            </select>
          </div>
          {paymentType === 'credit' && (
            <div>
              <label className={`text-xs font-bold ${label}`}>Credit weeks</label>
              <select value={creditWeeks} onChange={(e) => setCreditWeeks(e.target.value)} className={input}>
                <option value={1}>1 week</option>
                <option value={2}>2 weeks</option>
              </select>
            </div>
          )}
        </div>

        <div>
          <label className={`text-xs font-bold ${label}`}>Notes (invoice # etc.)</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} className={input} placeholder="Physical invoice…" />
        </div>

        <div className={`text-sm font-extrabold ${dark ? 'text-white' : 'text-slate-900'}`}>
          Total: GHS {Number(total).toLocaleString()}
        </div>

        {err && <p className="text-sm text-red-500 font-medium">{err}</p>}
        {msg && <p className="text-sm text-emerald-500 font-medium">{msg}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 rounded-xl bg-[#2596be] text-white font-bold disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save sale for OMR'}
        </button>
      </form>
    </div>
  );
}
