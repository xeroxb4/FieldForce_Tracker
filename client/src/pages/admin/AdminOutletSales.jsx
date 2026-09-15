import { useEffect, useState } from 'react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

const OMR_COLORS = [
  'from-[#117ea6] to-[#0d5f7d]',
  'from-violet-600 to-purple-800',
  'from-emerald-600 to-teal-800',
  'from-amber-500 to-orange-700',
  'from-rose-500 to-pink-700',
  'from-indigo-600 to-blue-800',
  'from-cyan-600 to-sky-800',
  'from-fuchsia-600 to-purple-800',
];

function colorFor(name) {
  let h = 0;
  for (let i = 0; i < (name || '').length; i++) h = (h + name.charCodeAt(i) * (i + 1)) % OMR_COLORS.length;
  return OMR_COLORS[h];
}

function fmtMoney(n) {
  return `GHS ${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function AdminOutletSales() {
  const { dark } = useTheme();
  const [omrs, setOmrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [step, setStep] = useState('omrs'); // omrs | customers | history
  const [selectedOmr, setSelectedOmr] = useState(null);
  const [selectedOutlet, setSelectedOutlet] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [editVisit, setEditVisit] = useState(null); // visit being edited
  const [editAmount, setEditAmount] = useState('');
  const [editOutcome, setEditOutcome] = useState('Order Placed');
  const [editProducts, setEditProducts] = useState('');
  const [editPayment, setEditPayment] = useState('cash');
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api
      .get('/admin/outlet-sales-history')
      .then((r) => setOmrs(r.data?.omrs || []))
      .catch(() => setOmrs([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const deleteVisit = async (visitId) => {
    if (!visitId) return;
    if (!window.confirm('Delete this visit/order permanently?')) return;
    setBusyId(visitId);
    try {
      await api.delete(`/admin/visits/${visitId}`);
      // refresh and stay on history if possible
      const { data } = await api.get('/admin/outlet-sales-history');
      setOmrs(data?.omrs || []);
      const omr = (data?.omrs || []).find((o) => o.omrName === selectedOmr?.omrName);
      setSelectedOmr(omr || null);
      const out = omr?.outlets?.find(
        (x) => (x.outletId || x.shopName) === (selectedOutlet?.outletId || selectedOutlet?.shopName)
      );
      if (out) {
        setSelectedOutlet(out);
        setStep('history');
      } else {
        setSelectedOutlet(null);
        setStep(omr ? 'customers' : 'omrs');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    } finally {
      setBusyId(null);
    }
  };

  const startEdit = (h) => {
    setEditVisit(h);
    setEditAmount(String(h.amount ?? ''));
    setEditOutcome(h.outcome || 'Order Placed');
    setEditPayment(h.paymentType || 'cash');
    const prod =
      (h.lineItems || [])
        .map((li) => `${li.productName || li.name} x${li.quantity} (${li.unit || 'pc'})`)
        .join('; ') || '';
    setEditProducts(prod);
  };

  const saveEdit = async () => {
    if (!editVisit?._id) return;
    setSaving(true);
    try {
      await api.put(`/admin/visits/${editVisit._id}`, {
        amount: Number(editAmount) || 0,
        outcome: editOutcome,
        paymentType: editPayment,
        products: editProducts,
      });
      setEditVisit(null);
      const { data } = await api.get('/admin/outlet-sales-history');
      setOmrs(data?.omrs || []);
      const omr = (data?.omrs || []).find((o) => o.omrName === selectedOmr?.omrName);
      setSelectedOmr(omr || null);
      const out = omr?.outlets?.find(
        (x) => (x.outletId || x.shopName) === (selectedOutlet?.outletId || selectedOutlet?.shopName)
      );
      if (out) setSelectedOutlet(out);
    } catch (err) {
      alert(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const filteredOmrs = omrs.filter((o) =>
    (o.omrName || '').toLowerCase().includes(q.toLowerCase())
  );

  const label = dark ? 'text-white' : 'text-slate-900';
  const muted = dark ? 'text-slate-400' : 'text-slate-600';
  const pageBg = '';

  const openOmr = (o) => {
    setSelectedOmr(o);
    setSelectedOutlet(null);
    setStep('customers');
    setQ('');
  };

  const openOutlet = (out) => {
    setSelectedOutlet(out);
    setStep('history');
  };

  const back = () => {
    if (step === 'history') {
      setSelectedOutlet(null);
      setStep('customers');
    } else if (step === 'customers') {
      setSelectedOmr(null);
      setStep('omrs');
    }
  };

  // SKU rollup for selected outlet
  const skuTotals = {};
  if (selectedOutlet?.history) {
    for (const h of selectedOutlet.history) {
      for (const li of h.lineItems || []) {
        const name = li.productName || li.name || 'Unknown';
        if (!skuTotals[name]) skuTotals[name] = { qty: 0, total: 0, unit: li.unit || 'pc' };
        skuTotals[name].qty += Number(li.quantity) || 0;
        skuTotals[name].total += Number(li.lineTotal) || 0;
      }
    }
  }
  const skuList = Object.entries(skuTotals).sort((a, b) => b[1].total - a[1].total);

  return (
    <div className={`space-y-4 ${pageBg}`}>
      <div>
        <h1 className={`text-xl font-extrabold ${label}`}>Outlet history by OMR</h1>
        <p className={`text-sm ${muted}`}>
          OMR → customers → full history, orders, SKUs &amp; purchases
        </p>
      </div>

      {/* Breadcrumb */}
      <div className={`flex flex-wrap items-center gap-2 text-xs font-semibold ${muted}`}>
        <button
          type="button"
          onClick={() => {
            setStep('omrs');
            setSelectedOmr(null);
            setSelectedOutlet(null);
          }}
          className={step === 'omrs' ? 'text-[#117ea6]' : 'underline'}
        >
          OMRs
        </button>
        {selectedOmr && (
          <>
            <span>›</span>
            <button
              type="button"
              onClick={() => {
                setStep('customers');
                setSelectedOutlet(null);
              }}
              className={step === 'customers' ? 'text-[#117ea6]' : 'underline'}
            >
              {selectedOmr.omrName}
            </button>
          </>
        )}
        {selectedOutlet && (
          <>
            <span>›</span>
            <span className="text-[#117ea6]">{selectedOutlet.shopName}</span>
          </>
        )}
      </div>

      {step !== 'omrs' && (
        <button
          type="button"
          onClick={back}
          className={`text-sm font-bold ${dark ? 'text-slate-300' : 'text-slate-700'}`}
        >
          ← Back
        </button>
      )}

      {step === 'omrs' && (
        <>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search OMR…"
            className={`w-full rounded-xl px-4 py-2.5 text-sm border ${
              dark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          />
          {loading && <p className={`text-sm ${muted}`}>Loading…</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredOmrs.map((o) => (
              <button
                key={o.omrName}
                type="button"
                onClick={() => openOmr(o)}
                className={`text-left rounded-2xl p-4 text-white shadow-lg bg-gradient-to-br ${colorFor(
                  o.omrName
                )} hover:scale-[1.01] transition`}
              >
                <div className="text-lg font-extrabold">{o.omrName}</div>
                <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold opacity-95">
                  <span>{o.customerCount} customers</span>
                  <span>{o.totalOrders} orders</span>
                  <span>{fmtMoney(o.totalSales)}</span>
                </div>
                <div className="mt-3 text-[11px] font-bold uppercase tracking-wide opacity-80">
                  Tap to open customers →
                </div>
              </button>
            ))}
          </div>
          {!loading && !filteredOmrs.length && (
            <p className={`text-sm ${muted}`}>No OMR sales history yet.</p>
          )}
        </>
      )}

      {step === 'customers' && selectedOmr && (
        <>
          <div
            className={`rounded-2xl p-4 text-white bg-gradient-to-br ${colorFor(selectedOmr.omrName)}`}
          >
            <div className="text-lg font-extrabold">{selectedOmr.omrName}</div>
            <div className="text-sm opacity-90 mt-1">
              {selectedOmr.customerCount} customers · {fmtMoney(selectedOmr.totalSales)} total
            </div>
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search customer / outlet…"
            className={`w-full rounded-xl px-4 py-2.5 text-sm border ${
              dark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          />
          <div className="space-y-2">
            {(selectedOmr.outlets || [])
              .filter((out) => (out.shopName || '').toLowerCase().includes(q.toLowerCase()))
              .map((out) => (
                <button
                  key={out.outletId || out.shopName}
                  type="button"
                  onClick={() => openOutlet(out)}
                  className={`w-full text-left rounded-2xl border p-4 ${
                    dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
                  }`}
                >
                  <div className={`font-bold ${label}`}>{out.shopName}</div>
                  <div className={`text-xs mt-1 flex flex-wrap gap-3 ${muted}`}>
                    <span>{out.visits} visits</span>
                    <span>{out.orders} orders</span>
                    <span className="font-bold text-[#117ea6]">{fmtMoney(out.totalSales)}</span>
                    {out.lastVisit && <span>Last: {out.lastVisit}</span>}
                  </div>
                  <div className="text-[11px] font-bold text-[#117ea6] mt-2">Open history →</div>
                </button>
              ))}
          </div>
        </>
      )}

      {step === 'history' && selectedOutlet && (
        <>
          <div
            className={`rounded-2xl border p-4 ${
              dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
            }`}
          >
            <div className={`text-lg font-extrabold ${label}`}>{selectedOutlet.shopName}</div>
            <div className={`text-sm ${muted}`}>{selectedOmr?.omrName}</div>
            <div className="grid grid-cols-3 gap-2 mt-3">
              <div className={`rounded-xl p-2 text-center ${dark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                <div className={`text-[10px] uppercase font-bold ${muted}`}>Orders</div>
                <div className={`text-xl font-extrabold ${label}`}>{selectedOutlet.orders}</div>
              </div>
              <div className={`rounded-xl p-2 text-center ${dark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                <div className={`text-[10px] uppercase font-bold ${muted}`}>Visits</div>
                <div className={`text-xl font-extrabold ${label}`}>{selectedOutlet.visits}</div>
              </div>
              <div className={`rounded-xl p-2 text-center ${dark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                <div className={`text-[10px] uppercase font-bold ${muted}`}>Purchases</div>
                <div className="text-sm font-extrabold text-[#117ea6]">{fmtMoney(selectedOutlet.totalSales)}</div>
              </div>
            </div>
          </div>

          {/* All SKUs purchased */}
          <div
            className={`rounded-2xl border p-4 ${
              dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
            }`}
          >
            <h3 className={`font-bold mb-2 ${label}`}>All SKUs purchased</h3>
            {!skuList.length ? (
              <p className={`text-sm ${muted}`}>No product lines recorded (amount-only or no-order visits).</p>
            ) : (
              <ul className="space-y-1.5">
                {skuList.map(([name, s]) => (
                  <li key={name} className={`flex justify-between text-sm gap-2 ${label}`}>
                    <span className="min-w-0">
                      {name}
                      <span className={`text-xs ${muted}`}>
                        {' '}
                        · {s.qty} {s.unit}
                      </span>
                    </span>
                    <span className="font-bold shrink-0">{fmtMoney(s.total)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Visit history */}
          <div
            className={`rounded-2xl border p-4 ${
              dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
            }`}
          >
            <h3 className={`font-bold mb-2 ${label}`}>Visit history</h3>
            <div className="space-y-2">
              {(selectedOutlet.history || []).map((h) => (
                <div
                  key={h._id || `${h.date}-${h.amount}`}
                  className={`rounded-xl border p-3 ${
                    dark ? 'border-slate-700 bg-slate-800/40' : 'border-slate-100 bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between gap-2">
                    <div>
                      <div className={`text-sm font-bold ${label}`}>{h.date}</div>
                      <div className={`text-xs ${muted}`}>
                        {h.outcome}
                        {h.paymentType ? ` · ${h.paymentType}` : ''}
                        {h.rep ? ` · ${h.rep}` : ''}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-extrabold text-[#117ea6]">{fmtMoney(h.amount)}</div>
                      {h._id && (
                        <div className="flex gap-2 justify-end mt-1">
                          <button
                            type="button"
                            onClick={() => startEdit(h)}
                            className="text-[10px] font-bold text-[#117ea6]"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={busyId === h._id}
                            onClick={() => deleteVisit(h._id)}
                            className="text-[10px] font-bold text-red-500"
                          >
                            {busyId === h._id ? '…' : 'Delete'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {(h.lineItems || []).length > 0 && (
                    <ul className={`mt-2 space-y-0.5 text-xs ${muted}`}>
                      {h.lineItems.map((li, i) => (
                        <li key={i} className="flex justify-between gap-2">
                          <span>
                            {li.productName || li.name} × {li.quantity} {li.unit || 'pc'}
                          </span>
                          <span>{fmtMoney(li.lineTotal)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Edit visit modal */}
      {editVisit && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-3">
          <div
            className={`w-full max-w-md rounded-2xl p-4 space-y-3 shadow-xl ${
              dark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'
            }`}
          >
            <div className="flex justify-between items-center">
              <h3 className="font-extrabold">Edit visit · {editVisit.date}</h3>
              <button type="button" className="text-sm font-bold opacity-60" onClick={() => setEditVisit(null)}>
                Close
              </button>
            </div>
            <div>
              <label className="text-xs font-bold opacity-70">Outcome</label>
              <select
                value={editOutcome}
                onChange={(e) => setEditOutcome(e.target.value)}
                className={`w-full mt-1 rounded-xl border px-3 py-2 text-sm ${
                  dark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-300'
                }`}
              >
                <option value="Order Placed">Order Placed</option>
                <option value="No Order">No Order</option>
                <option value="Shop Closed">Shop Closed</option>
                <option value="Follow Up">Follow Up</option>
                <option value="Extra Coverage">Extra Coverage</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold opacity-70">Amount (GHS)</label>
              <input
                type="number"
                step="0.01"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                className={`w-full mt-1 rounded-xl border px-3 py-2 text-sm ${
                  dark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-300'
                }`}
              />
            </div>
            <div>
              <label className="text-xs font-bold opacity-70">Payment</label>
              <select
                value={editPayment}
                onChange={(e) => setEditPayment(e.target.value)}
                className={`w-full mt-1 rounded-xl border px-3 py-2 text-sm ${
                  dark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-300'
                }`}
              >
                <option value="cash">Cash</option>
                <option value="credit">Credit</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold opacity-70">Products (text)</label>
              <textarea
                rows={3}
                value={editProducts}
                onChange={(e) => setEditProducts(e.target.value)}
                placeholder="e.g. Dry Impact x12 (pc); Cocoa lotion x1 (carton)"
                className={`w-full mt-1 rounded-xl border px-3 py-2 text-sm ${
                  dark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-300'
                }`}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEditVisit(null)}
                className={`py-2.5 rounded-xl font-bold text-sm border ${
                  dark ? 'border-slate-600' : 'border-slate-300'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={saveEdit}
                className="py-2.5 rounded-xl font-bold text-sm bg-[#117ea6] text-white disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
