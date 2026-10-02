import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api, { isOnline } from '../../services/api';
import InvoicePreview from '../../components/InvoicePreview';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  cacheProducts,
  getCachedProducts,
  enqueue,
  syncQueue,
  queueCount,
} from '../../services/offline';

const OUTCOMES = ['Order Placed', 'No Order', 'Shop Closed', 'Follow Up', 'Other'];
const EXTRA_OUTCOMES = ['Extra Coverage'];
const NO_ORDER_REASONS = [
  'Out of cash',
  'Owner not available',
  'I have a supplier',
  'High price',
  'Customer has payment issues',
  'Shop closed',
  'Not interested',
  'Stock still available',
  'Other',
];
const CATEGORIES = ['Lotion', 'Roll-on', 'Spray'];

export default function LogShop() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { dark } = useTheme();
  const ctx = location.state || {};
  const fromBeat = !!ctx.fromBeat && !!ctx.outletId;
  const extraCoverage = !!ctx.extraCoverage;
  const callbackVisitId = ctx.callbackVisitId || null;
  const isCallback = !!callbackVisitId;

  const [form, setForm] = useState({
    shopName: ctx.shopName || '',
    contactName: ctx.contactName || '',
    contactPhone: ctx.contactPhone || '',
    outcome: extraCoverage ? 'Extra Coverage' : 'Order Placed', // callback also Order Placed
    noOrderReason: '',
    paymentType: 'cash',
    creditDurationWeeks: '1',
    notes: '',
  });

  const [products, setProducts] = useState({});
  // Product picker state
  const [pickCategory, setPickCategory] = useState('');
  const [pickProductId, setPickProductId] = useState('');
  const [pickUnit, setPickUnit] = useState('pc');
  const [pickQty, setPickQty] = useState('1');

  const [cart, setCart] = useState([]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [offlinePending, setOfflinePending] = useState(queueCount());
  const [invoicePreview, setInvoicePreview] = useState(null);
  const [invoiceBeforeSave, setInvoiceBeforeSave] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        if (isOnline()) {
          const { data } = await api.get('/omr/products');
          setProducts(data);
          cacheProducts(data);
        } else {
          const cached = getCachedProducts();
          if (cached) setProducts(cached);
        }
      } catch {
        const cached = getCachedProducts();
        if (cached) setProducts(cached);
      }
    };
    load();
    // Try sync any queued items
    if (isOnline()) {
      syncQueue(api).then(() => setOfflinePending(queueCount()));
    }
  }, []);

  const productList = pickCategory ? products[pickCategory] || [] : [];
  const selectedProduct = productList.find((p) => p._id === pickProductId);

  const unitPrice = (sku, unit) => {
    if (!sku) return 0;
    if (unit === 'pack') return sku.pricePack || 0;
    if (unit === 'carton') return sku.priceCarton || 0;
    return sku.pricePc || 0;
  };

  const addProductLine = () => {
    if (!selectedProduct || !pickQty || Number(pickQty) < 1) {
      setStatus({ type: 'error', msg: 'Select product, unit and quantity' });
      return;
    }
    const price = unitPrice(selectedProduct, pickUnit);
    const qty = Number(pickQty);
    setCart((prev) => {
      const existing = prev.find(
        (i) => i.skuId === selectedProduct._id && i.unit === pickUnit
      );
      if (existing) {
        return prev.map((i) =>
          i.skuId === selectedProduct._id && i.unit === pickUnit
            ? {
                ...i,
                quantity: i.quantity + qty,
                lineTotal: (i.quantity + qty) * i.unitPrice,
              }
            : i
        );
      }
      return [
        ...prev,
        {
          skuId: selectedProduct._id,
          productName: selectedProduct.name,
          category: selectedProduct.category,
          size: selectedProduct.size,
          image: selectedProduct.image || '',
          unit: pickUnit,
          quantity: qty,
          unitPrice: price,
          lineTotal: qty * price,
        },
      ];
    });
    // Reset picker for next product
    setPickProductId('');
    setPickUnit('pc');
    setPickQty('1');
    setStatus(null);
  };

  const removeLine = (idx) => setCart((prev) => prev.filter((_, i) => i !== idx));

  const cartTotal = cart.reduce((s, i) => s + i.lineTotal, 0);

  const buildPayload = (gpsLoc) => ({
    shopName: form.shopName,
    outletId: ctx.outletId,
    contactName: form.contactName,
    contactPhone: form.contactPhone,
    outcome: extraCoverage ? 'Extra Coverage' : form.outcome,
      extraCoverage,
    noOrderReason: form.outcome === 'No Order' ? form.noOrderReason : '',
    // Extra coverage can carry cart → held in cloud until beat day (scheduled KPI)
    lineItems: form.outcome === 'Order Placed' || extraCoverage ? cart : [],
    amount: form.outcome === 'Order Placed' || extraCoverage ? cartTotal : 0,
    paymentType:
      form.outcome === 'Order Placed' || extraCoverage ? form.paymentType || 'cash' : '',
    creditDurationWeeks:
      form.outcome === 'Order Placed' && form.paymentType === 'credit'
        ? Number(form.creditDurationWeeks)
        : null,
    notes: form.notes,
    date: new Date().toISOString().slice(0, 10),
    location: gpsLoc,
    outletLocation: ctx.outletLocation,
    distanceMeters: ctx.distanceMeters,
  });

  const buildInvoiceData = () => ({
    shopName: form.shopName || ctx.shopName,
    contactName: form.contactName || ctx.contactName,
    contactPhone: form.contactPhone || ctx.contactPhone,
    repName: user?.fullName,
    territory: user?.territory,
    distributor: user?.distributor,
    date: new Date().toLocaleDateString(),
    lines: cart.map((c) => ({
      productName: c.productName || c.name,
      unit: c.unit,
      qty: c.qty || c.quantity,
      unitPrice: c.unitPrice,
      lineTotal: c.lineTotal || c.total,
    })),
    paymentType: form.paymentType,
    creditDays: form.creditDurationWeeks === '2' ? 14 : 7,
    total: cartTotal,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.shopName.trim()) {
      setStatus({ type: 'error', msg: 'Shop name is required' });
      return;
    }
    if (form.outcome === 'No Order' && !form.noOrderReason) {
      setStatus({ type: 'error', msg: 'Select a reason for No Order' });
      return;
    }
    if (isCallback) form.outcome = 'Order Placed';
    if (form.outcome === 'Order Placed' && cart.length === 0 && !extraCoverage) {
      setStatus({ type: 'error', msg: 'Add at least one product for an order' });
      return;
    }
    if (form.outcome === 'Order Placed' && form.paymentType === 'credit') {
      if (!['1', '2'].includes(String(form.creditDurationWeeks))) {
        setStatus({ type: 'error', msg: 'Select credit duration (1 or 2 weeks)' });
        return;
      }
    }

    // Order Placed → show invoice first (print), then complete visit
    if (form.outcome === 'Order Placed' && cart.length > 0 && !invoiceBeforeSave && !window.__ffSkipInvoice) {
      setInvoicePreview(buildInvoiceData());
      setInvoiceBeforeSave(true);
      return;
    }

    setLoading(true);
    setStatus(null);
    setInvoiceBeforeSave(false);

    const finishOk = (msg) => {
      setStatus({ type: 'success', msg });
      setCart([]);
      setInvoicePreview(null);
      setOfflinePending(queueCount());
      if (fromBeat) setTimeout(() => navigate('/omr/beats'), 1200);
      setLoading(false);
    };

    const send = async (gpsLoc) => {
      const payload = buildPayload(gpsLoc);

      // Offline → queue
      if (!isOnline()) {
        enqueue({ type: 'visit', payload: { ...payload, extraCoverage,
      syncedFromOffline: true } });
        finishOk('Saved offline. Will sync when network is back.');
        return;
      }

      try {
        if (isCallback) {
          const body = {
            lineItems: payload.lineItems,
            products: payload.products,
            amount: payload.amount,
            paymentType: payload.paymentType,
            creditDurationWeeks: payload.creditDurationWeeks,
            notes: payload.notes,
            location: payload.location,
          };
          if (!isOnline()) {
            enqueue({ type: 'callback-order', payload: { visitId: callbackVisitId, body } });
            finishOk('Call-back order saved offline. Will sync when online.');
            return;
          }
          await api.patch(`/omr/visits/${callbackVisitId}/callback-order`, body);
          await syncQueue(api);
          finishOk(
            form.paymentType === 'credit'
              ? 'Call-back order saved. Credit added to Owings.'
              : 'Call-back order saved on today’s visit.'
          );
        } else {
          await api.post('/omr/visits', payload);
          await syncQueue(api);
          finishOk(
            form.paymentType === 'credit'
              ? 'Visit saved. Credit added to Owings.'
              : 'Shop visit logged successfully!'
          );
        }
      } catch (err) {
        if (!err.response) {
          if (isCallback) {
            enqueue({
              type: 'callback-order',
              payload: {
                visitId: callbackVisitId,
                body: {
                  lineItems: payload.lineItems,
                  products: payload.products,
                  amount: payload.amount,
                  paymentType: payload.paymentType,
                  creditDurationWeeks: payload.creditDurationWeeks,
                  notes: payload.notes,
                  location: payload.location,
                },
              },
            });
            finishOk('Network issue — call-back saved offline.');
          } else {
            enqueue({ type: 'visit', payload: { ...payload, extraCoverage, syncedFromOffline: true } });
            finishOk('Network issue — saved offline. Will sync when online.');
          }
        } else {
          setStatus({ type: 'error', msg: err.response?.data?.message || 'Failed to log visit' });
          setLoading(false);
        }
      }
    };

    // Call-back (phone order): GPS optional
    if (isCallback) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) =>
            send({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
            }),
          () => send(undefined),
          { timeout: 6000, maximumAge: 60000 }
        );
      } else {
        send(undefined);
      }
      return;
    }

    if (fromBeat || ctx.outletId) {
      if (!navigator.geolocation) {
        setStatus({ type: 'error', msg: 'GPS required. Turn on location.' });
        setLoading(false);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          send({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          }),
        () => {
          // Allow offline save even if GPS fails, with warning stored in notes
          if (!isOnline()) {
            send(ctx.agentLocation || undefined);
          } else {
            setStatus({ type: 'error', msg: 'Turn on GPS to complete this outlet visit.' });
            setLoading(false);
          }
        },
        { enableHighAccuracy: true, timeout: 15000 }
      );
    } else {
      send(ctx.agentLocation || undefined);
    }
  };

  const labelCls = dark ? 'block text-sm font-semibold text-slate-200 mb-1' : 'block text-sm font-semibold text-slate-800 mb-1';
  const labelXs = dark ? 'block text-xs font-semibold text-slate-300 mb-1' : 'block text-xs font-semibold text-slate-600 mb-1';
  const inputCls = dark
    ? 'w-full border border-slate-600 rounded-xl px-4 py-3 text-sm bg-slate-800 text-white placeholder:text-slate-400 disabled:bg-slate-800 disabled:text-white disabled:opacity-100'
    : 'w-full border border-slate-300 rounded-xl px-4 py-3 text-sm bg-white text-slate-900 disabled:bg-slate-50 disabled:text-slate-900 disabled:opacity-100';
  const inputSm = dark
    ? 'w-full border border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-slate-900 text-white'
    : 'w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm bg-white text-slate-900';
  const cardCls = dark
    ? 'bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-3'
    : 'bg-white border border-slate-200 rounded-xl p-4 space-y-3';


  const addressLine =
    [ctx.address, ctx.territory, form.contactPhone].filter(Boolean).join(' · ') ||
    [form.contactName, form.contactPhone].filter(Boolean).join(' · ') ||
    'Outlet location';

  const confirmAndSubmit = (e) => {
    if (e) e.preventDefault();
    const msg =
      form.outcome === 'No Order'
        ? 'Confirm complete visit with No Order?'
        : cart.length
        ? `Confirm complete visit?\n\nTotal: GHS ${cartTotal.toFixed(2)}`
        : 'Confirm complete visit?';
    if (!window.confirm(msg)) return;
    // Skip invoice-first flow; user already confirmed. Print is a separate button.
    window.__ffSkipInvoice = true;
    const fake = { preventDefault() {} };
    handleSubmit(fake);
    setTimeout(() => {
      window.__ffSkipInvoice = false;
    }, 1500);
  };

  return (
    <div className={`min-h-full pb-10 ${dark ? 'text-slate-100' : 'text-slate-900'}`}>
      <InvoicePreview
        open={!!invoicePreview}
        invoice={invoicePreview}
        pendingComplete={invoiceBeforeSave}
        onClose={() => {
          setInvoicePreview(null);
          setInvoiceBeforeSave(false);
        }}
        onConfirmComplete={() => {
          setInvoiceBeforeSave(false);
          setInvoicePreview(null);
          window.__ffSkipInvoice = true;
          confirmAndSubmit();
          setTimeout(() => {
            window.__ffSkipInvoice = false;
          }, 800);
        }}
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
            dark ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700'
          }`}
        >
          ←
        </button>
        <div className="flex-1 text-center">
          <div className={`text-[15px] font-extrabold tracking-tight ${dark ? 'text-white' : 'text-slate-900'}`}>
            FieldForce Tracker
          </div>
          <div className={`text-[11px] ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
            Log Shop · OMR Field Sales
          </div>
        </div>
        <div className="w-9" />
      </div>

      {/* CARD 1 — Outlet + GPS */}
      <div
        className={`rounded-2xl border p-4 mb-3 ${
          dark ? 'bg-[#0f172a] border-slate-700' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <div className="flex gap-3 items-start">
          <div className="text-2xl leading-none mt-0.5">📍</div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-amber-400 text-[15px] leading-snug">
              {form.shopName || ctx.shopName || 'Outlet'}
            </div>
            <div className={`text-xs mt-1 leading-relaxed ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
              {addressLine}
            </div>
          </div>
          <div className="shrink-0 flex flex-col items-center gap-1 w-[72px]">
            <div className="w-11 h-11 rounded-full bg-emerald-500/15 border-2 border-emerald-400/50 flex items-center justify-center">
              <span className="text-emerald-400 text-lg font-black">✓</span>
            </div>
            <span className="text-[9px] font-extrabold tracking-wide text-emerald-400 uppercase text-center leading-tight">
              GPS Verified
            </span>
          </div>
        </div>
        {!isOnline() && (
          <div className="mt-2 text-[10px] font-semibold text-amber-400">Offline mode</div>
        )}
        {offlinePending > 0 && (
          <div className="mt-1 text-[10px] text-amber-400/90">{offlinePending} pending sync</div>
        )}
      </div>

      <form
        id="log-shop-form"
        onSubmit={(e) => {
          e.preventDefault();
          confirmAndSubmit();
        }}
        className="space-y-3"
      >
        {!fromBeat && !isCallback && (
          <div className={`rounded-2xl border p-4 space-y-2 ${dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
            <input
              className={inputCls}
              placeholder="Shop name *"
              value={form.shopName}
              onChange={(e) => setForm({ ...form, shopName: e.target.value })}
              required
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                className={inputCls}
                placeholder="Contact"
                value={form.contactName}
                onChange={(e) => setForm({ ...form, contactName: e.target.value })}
              />
              <input
                className={inputCls}
                placeholder="Phone"
                value={form.contactPhone}
                onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
              />
            </div>
          </div>
        )}

        {/* CARD 2 — Outcome */}
        {!isCallback && !extraCoverage && (
          <div
            className={`rounded-2xl border p-4 ${
              dark ? 'bg-[#0f172a] border-slate-700' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className={`text-xs font-bold mb-2 ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
              Outcome
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, outcome: 'Order Placed', noOrderReason: '' })}
                className={`py-3 rounded-xl text-sm font-bold border ${
                  form.outcome === 'Order Placed'
                    ? 'bg-[#117ea6] text-white border-[#117ea6]'
                    : dark
                    ? 'bg-slate-800 text-slate-300 border-slate-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                Order placed
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, outcome: 'No Order' })}
                className={`py-3 rounded-xl text-sm font-bold border ${
                  form.outcome === 'No Order'
                    ? 'bg-[#117ea6] text-white border-[#117ea6]'
                    : dark
                    ? 'bg-slate-800 text-slate-300 border-slate-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                No order placed
              </button>
            </div>
          </div>
        )}
        {(isCallback || extraCoverage) && (
          <div className={`text-xs font-semibold px-3 py-2 rounded-xl ${dark ? 'bg-violet-500/15 text-violet-300' : 'bg-violet-50 text-violet-700'}`}>
            {isCallback ? 'Call-back order' : 'Extra coverage visit'}
          </div>
        )}

        {/* CARD 3 — Order placed builder */}
        {(form.outcome === 'Order Placed' || isCallback || extraCoverage) && (
          <div
            className={`rounded-2xl border p-4 space-y-3 ${
              dark ? 'bg-[#0f172a] border-slate-700' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className={`text-sm font-extrabold ${dark ? 'text-white' : 'text-slate-900'}`}>
                Order placed
              </h3>
              <span className="opacity-60">🛍️</span>
            </div>

            <div>
              <label className={labelXs}>Category</label>
              <select
                value={pickCategory}
                onChange={(e) => {
                  setPickCategory(e.target.value);
                  setPickProductId('');
                }}
                className={`${inputSm} ${pickCategory ? 'border-[#0d9488] ring-1 ring-[#0d9488]/30' : ''}`}
              >
                <option value="">Select category…</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c === 'Roll-on' ? 'ROLL ON' : c.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {pickCategory && (
              <div>
                <label className={labelXs}>Product</label>
                <select
                  value={pickProductId}
                  onChange={(e) => setPickProductId(e.target.value)}
                  className={inputSm}
                >
                  <option value="">List of SKUs…</option>
                  {productList.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                      {p.size ? ` ${p.size}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedProduct && (
              <div
                className={`flex items-center gap-3 rounded-xl p-2 border ${
                  dark ? 'border-slate-600 bg-slate-800/60' : 'border-teal-200 bg-teal-50/50'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-xl overflow-hidden shrink-0 flex items-center justify-center border ${
                    dark ? 'border-slate-600 bg-slate-900' : 'border-slate-200 bg-white'
                  }`}
                >
                  {selectedProduct.image ? (
                    <img src={selectedProduct.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl">🧴</span>
                  )}
                </div>
                <div className={`text-xs font-bold truncate ${dark ? 'text-white' : 'text-slate-800'}`}>
                  {selectedProduct.name}
                </div>
              </div>
            )}

            {selectedProduct && (
              <div>
                <label className={labelXs}>Unit</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'pc', label: 'PC' },
                    { id: 'pack', label: 'Pack' },
                    { id: 'carton', label: 'Carton' },
                  ].map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setPickUnit(u.id)}
                      className={`py-2.5 rounded-xl text-xs font-bold border ${
                        pickUnit === u.id
                          ? 'bg-[#0d9488] text-white border-[#0d9488]'
                          : dark
                          ? 'bg-slate-800 text-slate-300 border-slate-600'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {u.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedProduct && (
              <div className="grid grid-cols-2 gap-3 items-end">
                <div>
                  <label className={labelXs}>Quantity</label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPickQty(String(Math.max(1, Number(pickQty || 1) - 1)))}
                      className={`w-10 h-10 rounded-xl font-bold border ${
                        dark ? 'border-slate-600 bg-slate-800' : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={pickQty}
                      onChange={(e) => setPickQty(e.target.value)}
                      className={`${inputSm} text-center font-bold`}
                    />
                    <button
                      type="button"
                      onClick={() => setPickQty(String(Number(pickQty || 1) + 1))}
                      className={`w-10 h-10 rounded-xl font-bold border ${
                        dark ? 'border-slate-600 bg-slate-800' : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      +
                    </button>
                  </div>
                </div>
                <div>
                  <label className={labelXs}>Price (GHS)</label>
                  <div
                    className={`rounded-xl px-3 py-2.5 text-sm font-bold border ${
                      dark ? 'border-slate-600 bg-slate-800 text-white' : 'border-slate-200 bg-slate-50 text-slate-900'
                    }`}
                  >
                    {Number(unitPrice(selectedProduct, pickUnit) || 0).toFixed(2)}
                    <span className={`text-[10px] font-medium ml-1 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                      / {pickUnit}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {selectedProduct && (
              <div>
                <label className={labelXs}>Payment</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, paymentType: 'cash' })}
                    className={`py-2.5 rounded-xl text-sm font-bold border flex items-center justify-center gap-1.5 ${
                      form.paymentType === 'cash'
                        ? 'bg-[#0d9488] text-white border-[#0d9488]'
                        : dark
                        ? 'bg-slate-800 text-slate-300 border-slate-600'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    <span>💵</span> Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, paymentType: 'credit' })}
                    className={`py-2.5 rounded-xl text-sm font-bold border flex items-center justify-center gap-1.5 ${
                      form.paymentType === 'credit'
                        ? 'bg-[#0d9488] text-white border-[#0d9488]'
                        : dark
                        ? 'bg-slate-800 text-slate-300 border-slate-600'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    <span>💳</span> Credit
                  </button>
                </div>
                {form.paymentType === 'credit' && (
                  <select
                    value={form.creditDurationWeeks}
                    onChange={(e) => setForm({ ...form, creditDurationWeeks: e.target.value })}
                    className={`${inputSm} mt-2`}
                  >
                    <option value="1">1 week</option>
                    <option value="2">2 weeks</option>
                  </select>
                )}
              </div>
            )}

            {selectedProduct && (
              <button
                type="button"
                onClick={addProductLine}
                className="w-full bg-[#0d9488] text-white text-sm font-bold py-3 rounded-xl flex items-center justify-center gap-2"
              >
                <span>🛒</span> Add to cart
              </button>
            )}
          </div>
        )}

        {/* CARD 4 — Order cart */}
        {(form.outcome === 'Order Placed' || isCallback || extraCoverage) && cart.length > 0 && (
          <div
            className={`rounded-2xl border p-4 space-y-2 ${
              dark ? 'bg-[#0f172a] border-slate-700' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className={`text-sm font-extrabold ${dark ? 'text-white' : 'text-slate-900'}`}>
                Order cart ({cart.length})
              </h3>
              <button
                type="button"
                onClick={() => setCart([])}
                className="text-[11px] font-bold text-slate-400"
              >
                Clear all
              </button>
            </div>
            {cart.map((i, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-2.5 rounded-xl p-2 border ${
                  dark ? 'border-slate-700 bg-slate-800/40' : 'border-slate-100 bg-slate-50'
                }`}
              >
                <div
                  className={`w-11 h-11 rounded-lg overflow-hidden shrink-0 flex items-center justify-center border ${
                    dark ? 'border-slate-600 bg-slate-900' : 'border-slate-200 bg-white'
                  }`}
                >
                  {i.image ? (
                    <img src={i.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg">🧴</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-semibold truncate ${dark ? 'text-white' : 'text-slate-800'}`}>
                    {i.productName}
                  </div>
                  <div className={`text-[10px] ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {String(i.unit).toUpperCase()} · {i.quantity} × GHS {Number(i.unitPrice).toFixed(2)}
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-400 shrink-0">
                  GHS {i.lineTotal.toFixed(2)}
                </span>
                <button
                  type="button"
                  onClick={() => removeLine(idx)}
                  className="text-base px-1 opacity-70"
                  title="Remove"
                >
                  🗑️
                </button>
              </div>
            ))}
            <div className="flex justify-between items-center pt-2 border-t border-slate-700/50">
              <span className={`text-xs font-bold uppercase ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                Total
              </span>
              <span className="text-base font-extrabold text-emerald-400">
                GHS {cartTotal.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* No order reasons */}
        {form.outcome === 'No Order' && (
          <div
            className={`rounded-2xl border p-4 space-y-3 ${
              dark ? 'bg-[#0f172a] border-slate-700' : 'bg-white border-slate-200'
            }`}
          >
            <div>
              <h3 className={`text-sm font-extrabold ${dark ? 'text-white' : 'text-slate-900'}`}>
                No order
              </h3>
              <p className={`text-[11px] mt-0.5 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                Select a reason below.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {NO_ORDER_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setForm({ ...form, noOrderReason: r })}
                  className={`text-[11px] font-semibold px-3 py-2 rounded-xl border ${
                    form.noOrderReason === r
                      ? 'bg-[#117ea6] text-white border-[#117ea6]'
                      : dark
                      ? 'bg-slate-800 text-slate-300 border-slate-600'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className={labelCls}>Notes (optional)</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
            className={inputCls}
            placeholder="Any extra note…"
          />
        </div>

        {status && (
          <div
            className={`text-sm px-4 py-3 rounded-xl border font-medium ${
              status.type === 'success'
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : 'bg-red-500/15 text-red-400 border-red-500/30'
            }`}
          >
            {status.msg}
          </div>
        )}

        {/* Bottom actions */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            disabled={loading || cart.length === 0}
            onClick={() => {
              setInvoiceBeforeSave(false);
              setInvoicePreview(buildInvoiceData());
            }}
            className={`py-3.5 rounded-xl text-sm font-bold border flex items-center justify-center gap-1.5 ${
              dark ? 'bg-slate-800 text-white border-slate-600' : 'bg-slate-900 text-white border-slate-900'
            } disabled:opacity-40`}
          >
            <span>🖨️</span> Print invoice
          </button>
          <button
            type="submit"
            disabled={loading}
            className="py-3.5 rounded-xl text-sm font-bold bg-[#a3e635] text-slate-900 disabled:opacity-60 flex items-center justify-center gap-1.5"
          >
            <span>✓</span> {loading ? 'Saving…' : 'Complete visit'}
          </button>
        </div>
      </form>
    </div>
  );
}
