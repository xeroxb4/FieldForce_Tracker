import { useEffect, useState } from 'react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { useAdminPremium, AdminPageHeader } from '../../lib/adminPremium';
import PremiumPicker from '../../components/PremiumPicker';

export default function AdminEnterSale() {
  const { dark } = useTheme();
  const ap = useAdminPremium(dark);
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
  const [omrOpen, setOmrOpen] = useState(false);
  const [outletOpen, setOutletOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);

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


  const input = ap.input;
  const card = ap.card;
  const cardStyle = ap.cardStyle;
  const soft = ap.cardSoft;
  const softStyle = ap.cardSoftStyle;

  return (
    <>
    <div className="space-y-5 max-w-2xl">
      <AdminPageHeader
        dark={dark}
        eyebrow="Sales desk"
        title="Enter sale for OMR"
        subtitle="Admin only — post physical / old-app invoices into the correct outlet"
      />

      <form onSubmit={submit} className={`${card} p-5 space-y-4`} style={cardStyle}>
        <div>
          <label className={ap.label}>OMR *</label>
          <button type="button" onClick={() => setOmrOpen(true)} className={input + ' text-left flex justify-between items-center'}>
            <span className={!omrId ? (dark ? 'text-slate-400' : 'text-slate-400') : ''}>
              {omrs.find((u) => String(u._id) === String(omrId))
                ? `${omrs.find((u) => String(u._id) === String(omrId)).fullName}${omrs.find((u) => String(u._id) === String(omrId)).distributor ? ' · ' + omrs.find((u) => String(u._id) === String(omrId)).distributor : ''}`
                : 'Select OMR…'}
            </span>
            <span className="opacity-60">▾</span>
          </button>
        </div>

        <div>
          <label className={ap.label}>Outlet *</label>
          <button
            type="button"
            disabled={!omrId}
            onClick={() => omrId && setOutletOpen(true)}
            className={input + ' text-left flex justify-between items-center disabled:opacity-50'}
          >
            <span>
              {outlets.find((o) => String(o._id) === String(outletId))
                ? `${outlets.find((o) => String(o._id) === String(outletId)).displayName || outlets.find((o) => String(o._id) === String(outletId)).name}`
                : 'Select outlet…'}
            </span>
            <span className="opacity-60">▾</span>
          </button>
        </div>

        <div>
          <label className={ap.label}>Sale date *</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={input} required />
        </div>

        <div className={`${soft} p-4 space-y-3`} style={softStyle}>
          <p className={ap.label}>Add product lines (optional)</p>
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
            <button
              type="button"
              onClick={addLine}
              className="rounded-2xl text-sm font-black text-white"
              style={ap.btnPrimaryStyle}
            >
              Add
            </button>
          </div>
          {lines.map((l, i) => (
            <div
              key={i}
              className={`flex justify-between items-center text-sm rounded-xl px-3 py-2 ${
                dark ? 'bg-black/30 text-white' : 'bg-slate-50 text-slate-900'
              }`}
            >
              <span className="font-semibold">
                {l.productName} × {l.quantity} {l.unit}
              </span>
              <span className="font-black flex items-center gap-2">
                GHS {l.lineTotal}
                <button
                  type="button"
                  className="text-red-400 text-xs font-bold"
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
            <label className={ap.label}>Total amount (GHS) if no product lines</label>
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

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={ap.label}>Payment</label>
            <button type="button" onClick={() => setPayOpen(true)} className={input + ' text-left flex justify-between'}>
              <span>{paymentType === 'credit' ? 'Credit' : 'Cash'}</span>
              <span className="opacity-60">▾</span>
            </button>
          </div>
          {paymentType === 'credit' && (
            <div>
              <label className={ap.label}>Credit weeks</label>
              <select value={creditWeeks} onChange={(e) => setCreditWeeks(e.target.value)} className={input}>
                <option value={1}>1 week</option>
                <option value={2}>2 weeks</option>
              </select>
            </div>
          )}
        </div>

        <div>
          <label className={ap.label}>Notes (invoice # etc.)</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={input}
            placeholder="Physical invoice…"
          />
        </div>

        <div
          className={`flex items-center justify-between rounded-2xl px-4 py-3 ${
            dark ? 'bg-black/30' : 'bg-violet-50'
          }`}
        >
          <span className={`text-xs font-black uppercase tracking-wider ${ap.muted}`}>Total</span>
          <span className={`text-xl font-black ${ap.title}`}>GHS {Number(total || 0).toLocaleString()}</span>
        </div>

        {err && (
          <div className="rounded-2xl px-3 py-2 text-sm font-semibold bg-red-500/15 text-red-400 border border-red-500/20">
            {err}
          </div>
        )}
        {msg && (
          <div className="rounded-2xl px-3 py-2 text-sm font-semibold bg-emerald-500/15 text-emerald-500 border border-emerald-500/20">
            {msg}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className={`w-full ${ap.btnPrimary} disabled:opacity-60`}
          style={ap.btnPrimaryStyle}
        >
          {saving ? 'Saving…' : 'Post sale'}
        </button>
      </form>
    </div>

      <PremiumPicker
        open={omrOpen}
        onClose={() => setOmrOpen(false)}
        title="Select OMR"
        options={omrs.map((u) => ({
          value: u._id,
          label: u.fullName,
          sub: u.distributor && !/^nivea\s*ghana$/i.test(String(u.distributor).trim()) ? u.distributor : '',
        }))}
        value={omrId}
        onChange={(v) => {
          setOmrId(v);
          setOutletId('');
        }}
      />
      <PremiumPicker
        open={outletOpen}
        onClose={() => setOutletOpen(false)}
        title="Select outlet"
        options={outlets.map((o) => ({
          value: o._id,
          label: o.displayName || o.name,
          sub: [o.channelType || o.classification, o.avcTier ? `AVC ${o.avcTier}` : ''].filter(Boolean).join(' · '),
        }))}
        value={outletId}
        onChange={(v) => setOutletId(v)}
      />
      <PremiumPicker
        open={payOpen}
        onClose={() => setPayOpen(false)}
        title="Payment"
        options={[
          { value: 'cash', label: 'Cash' },
          { value: 'credit', label: 'Credit' },
        ]}
        value={paymentType}
        onChange={(v) => setPaymentType(v)}
        searchable={false}
      />
    </>
  );
}

