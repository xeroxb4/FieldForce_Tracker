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
  const [skuSheetOpen, setSkuSheetOpen] = useState(false);
  const [skuSearch, setSkuSearch] = useState('');

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
  const filteredSkus = (() => {
    const q = skuSearch.trim().toLowerCase();
    if (!q) return productList;
    return productList.filter(
      (p) =>
        String(p.name || '').toLowerCase().includes(q) ||
        String(p.size || '').toLowerCase().includes(q)
    );
  })();

  const catMeta = {
    Lotion: { icon: '🧴', label: 'Lotion', tone: '#28B8F0' },
    'Roll-on': { icon: '🫧', label: 'Roll-on', tone: '#AC60A4' },
    Spray: { icon: '💨', label: 'Spray', tone: '#AB6BF0' },
  };

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
    ? 'w-full border border-white/10 rounded-2xl px-4 py-3.5 text-sm bg-white/5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#3F258B]/40 focus:border-[#3F258B]/50 disabled:opacity-100'
    : 'w-full border border-slate-300 rounded-2xl px-4 py-3.5 text-sm bg-slate-50 text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#3F258B]/25 focus:border-[#3F258B]/50 disabled:bg-slate-50 disabled:opacity-100';
  const inputSm = dark
    ? 'w-full border border-white/10 rounded-2xl px-3.5 py-3 text-sm bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-[#3F258B]/40'
    : 'w-full border border-slate-300 rounded-2xl px-3.5 py-3 text-sm bg-slate-50 text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#3F258B]/25';
  const cardCls = dark
    ? 'bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-3'
    : 'bg-white border border-slate-300 rounded-xl p-4 space-y-3 shadow-md';

  const addressLine =
    [ctx.address, ctx.territory, form.contactPhone].filter(Boolean).join(' · ') ||
    [form.contactName, form.contactPhone].filter(Boolean).join(' · ') ||
    'Outlet location';

  // Deeper light-mode cards so they separate clearly from the page background
  const glass = dark
    ? 'bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-slate-950/95 border border-white/12 shadow-[0_12px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl'
    : 'bg-white border border-slate-300/95 shadow-[0_12px_40px_rgba(15,23,42,0.12),0_2px_8px_rgba(15,23,42,0.06)]';

  const pillActive =
    'bg-gradient-to-r from-[#5b3aad] to-[#3F258B] text-white border-transparent shadow-lg shadow-[#3F258B]/30';
  const pillIdle = dark
    ? 'bg-slate-800/80 text-slate-300 border-white/10 hover:border-white/20'
    : 'bg-slate-50 text-slate-700 border-slate-300 hover:border-slate-400 shadow-sm';

  const confirmAndSubmit = (e) => {
    if (e) e.preventDefault();
    const msg =
      form.outcome === 'No Order'
        ? 'Confirm complete visit with No Order?'
        : cart.length
        ? `Confirm complete visit?\n\nTotal: GHS ${cartTotal.toFixed(2)}`
        : 'Confirm complete visit?';
    if (!window.confirm(msg)) return;
    window.__ffSkipInvoice = true;
    const fake = { preventDefault() {} };
    handleSubmit(fake);
    setTimeout(() => {
      window.__ffSkipInvoice = false;
    }, 1500);
  };

  return (
    <div
      className={`min-h-full pb-12 -mx-1 px-0.5 ${
        dark
          ? 'bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100'
          : 'bg-gradient-to-b from-slate-200/90 via-slate-100 to-violet-50/60 text-slate-900'
      }`}
    >
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

      {/* Premium header */}
      <div className="flex items-center gap-3 mb-5 pt-1">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border transition ${
            dark
              ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
              : 'bg-white border-slate-200 text-slate-700 shadow-sm'
          }`}
        >
          ←
        </button>
        <div className="flex-1 text-center">
          <div
            className={`text-[17px] font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r ${
              dark ? 'from-white via-violet-200 to-violet-100' : 'from-slate-900 via-[#3F258B] to-violet-700'
            }`}
          >
            FieldForce Tracker
          </div>
          <div
            className={`text-[11px] font-semibold tracking-wide uppercase ${
              dark ? 'text-violet-300/90' : 'text-[#3F258B]'
            }`}
          >
            Log Shop · OMR Field Sales
          </div>
        </div>
        <div className="w-10" />
      </div>

      {/* CARD 1 — Outlet + GPS (reference style) */}
      <div
        className={`rounded-2xl mb-3 overflow-hidden border ${
          dark
            ? 'bg-[#12171f] border-white/10 shadow-[0_8px_28px_rgba(0,0,0,0.4)]'
            : 'bg-slate-900 border-slate-800 shadow-lg'
        }`}
      >
        <div className="p-4 flex gap-3 items-start">
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2">
              <span className="text-amber-400 text-lg leading-none mt-0.5 shrink-0">📍</span>
              <div className="min-w-0">
                <div className="font-bold text-amber-400 text-[15px] leading-snug tracking-tight">
                  {form.shopName || ctx.shopName || 'Outlet'}
                </div>
                <div className="text-[12px] mt-1 leading-snug text-slate-400 font-medium">
                  {ctx.address || form.contactName || 'Outlet address'}
                  {ctx.territory ? (
                    <>
                      <br />
                      {ctx.territory}
                      {ctx.territory && !String(ctx.territory).toLowerCase().includes('region')
                        ? ''
                        : ''}
                    </>
                  ) : form.contactPhone ? (
                    <>
                      <br />
                      {form.contactPhone}
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2 pt-0.5">
            <div className="w-9 h-9 rounded-full border-2 border-emerald-400/80 flex items-center justify-center">
              <span className="text-emerald-400 text-sm font-black">✓</span>
            </div>
            <div className="text-left leading-tight">
              <div className="text-[10px] font-extrabold tracking-wide text-emerald-400 uppercase">
                GPS
              </div>
              <div className="text-[10px] font-extrabold tracking-wide text-emerald-400 uppercase">
                Verified
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 px-4 py-2.5 flex items-center gap-2.5">
          <span className="w-5 h-5 rounded-full border border-emerald-400/70 flex items-center justify-center text-emerald-400 text-[10px] font-bold shrink-0">
            ✓
          </span>
          <div className="text-[12px] text-slate-300 font-medium">
            <span className="text-slate-200">Start visit complete</span>
            <span className="text-slate-500">
              {' '}
              · Today,{' '}
              {new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </span>
          </div>
          {!isOnline() && (
            <span className="ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
              Offline
            </span>
          )}
        </div>
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
          <div className={`rounded-3xl p-4 space-y-2 ${glass}`}>
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
          <div className={`rounded-3xl p-4 ${glass}`}>
            <div
              className={`text-[11px] font-bold uppercase tracking-wider mb-3 ${
                dark ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              Outcome
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setForm({ ...form, outcome: 'Order Placed', noOrderReason: '' })}
                className={`py-3.5 rounded-2xl text-sm font-bold border transition ${
                  form.outcome === 'Order Placed' ? pillActive : pillIdle
                }`}
              >
                Order placed
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, outcome: 'No Order' })}
                className={`py-3.5 rounded-2xl text-sm font-bold border transition ${
                  form.outcome === 'No Order' ? pillActive : pillIdle
                }`}
              >
                No order placed
              </button>
            </div>
          </div>
        )}
        {(isCallback || extraCoverage) && (
          <div
            className={`text-xs font-bold px-4 py-2.5 rounded-2xl border ${
              dark
                ? 'bg-violet-500/15 text-violet-300 border-violet-500/25'
                : 'bg-violet-50 text-violet-700 border-violet-200'
            }`}
          >
            {isCallback ? 'Call-back order' : 'Extra coverage visit'}
          </div>
        )}

        {/* CARD 3 — Order builder */}
        {(form.outcome === 'Order Placed' || isCallback || extraCoverage) && (
          <div className={`rounded-3xl p-4 space-y-3.5 ${glass}`}>
            <div className="flex items-center justify-between">
              <h3 className={`text-sm font-extrabold tracking-tight ${dark ? 'text-white' : 'text-slate-900'}`}>
                Order placed
              </h3>
              <span className="text-sm opacity-50">🛍️</span>
            </div>

            <div>
              <label className={`${labelXs} uppercase tracking-wider`}>Category</label>
              <div className="grid grid-cols-3 gap-2.5">
                {CATEGORIES.map((c) => {
                  const meta = catMeta[c] || { icon: '📦', label: c, tone: '#3F258B' };
                  const active = pickCategory === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setPickCategory(c);
                        setPickProductId('');
                        setSkuSearch('');
                      }}
                      className={`relative overflow-hidden rounded-2xl py-3.5 px-2 text-center transition active:scale-[0.97] ${
                        active
                          ? 'text-white'
                          : dark
                          ? 'bg-slate-900/80 border border-white/10 text-slate-300'
                          : 'bg-white border border-slate-200 text-slate-700 shadow-sm'
                      }`}
                      style={
                        active
                          ? {
                              background: `linear-gradient(145deg, ${meta.tone}, #3F258B)`,
                              boxShadow: `0 1px 0 rgba(255,255,255,0.2) inset, 0 12px 28px ${meta.tone}55`,
                              border: '1px solid transparent',
                            }
                          : undefined
                      }
                    >
                      <div className="text-xl leading-none mb-1">{meta.icon}</div>
                      <div className="text-[11px] font-black tracking-wide uppercase">
                        {meta.label}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {pickCategory && (
              <div>
                <label className={`${labelXs} uppercase tracking-wider`}>Product</label>
                <button
                  type="button"
                  onClick={() => {
                    setSkuSearch('');
                    setSkuSheetOpen(true);
                  }}
                  className={`w-full rounded-2xl px-4 py-3.5 text-left flex items-center justify-between gap-3 border transition active:scale-[0.99] ${
                    dark
                      ? 'bg-slate-950/80 border-white/12 text-white'
                      : 'bg-white border-slate-300 text-slate-900 shadow-[0_8px_24px_rgba(15,23,42,0.08)]'
                  }`}
                >
                  <div className="min-w-0">
                    <div
                      className={`text-[10px] font-black uppercase tracking-wider ${
                        dark ? 'text-violet-300/80' : 'text-[#3F258B]'
                      }`}
                    >
                      {pickCategory} · {productList.length} SKUs
                    </div>
                    <div className={`text-sm font-bold truncate mt-0.5 ${selectedProduct ? '' : dark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {selectedProduct
                        ? `${selectedProduct.name}${selectedProduct.size ? ` · ${selectedProduct.size}` : ''}`
                        : 'Tap to choose SKU…'}
                    </div>
                  </div>
                  <span
                    className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-black"
                    style={{
                      background: 'linear-gradient(145deg, #5b3aad, #3F258B)',
                      boxShadow: '0 8px 18px rgba(63,37,139,0.35)',
                    }}
                  >
                    ⌕
                  </span>
                </button>
              </div>
            )}

            {/* Premium SKU bottom sheet */}
            {skuSheetOpen && (
              <div className="fixed inset-0 z-[80] flex items-end justify-center">
                <button
                  type="button"
                  className="absolute inset-0 bg-black/55 backdrop-blur-sm"
                  aria-label="Close"
                  onClick={() => setSkuSheetOpen(false)}
                />
                <div
                  className={`relative w-full max-w-lg max-h-[78vh] rounded-t-[1.75rem] flex flex-col overflow-hidden ${
                    dark ? 'bg-slate-950 border-t border-white/10' : 'bg-white'
                  }`}
                  style={{
                    boxShadow:
                      '0 -12px 48px rgba(0,0,0,0.35), 0 1px 0 rgba(255,255,255,0.12) inset',
                  }}
                >
                  <div className="flex justify-center pt-3 pb-1">
                    <div className={`w-10 h-1 rounded-full ${dark ? 'bg-white/20' : 'bg-slate-300'}`} />
                  </div>
                  <div className="px-4 pb-3 pt-1 flex items-center justify-between gap-3">
                    <div>
                      <p
                        className={`text-[10px] font-black uppercase tracking-[0.2em] ${
                          dark ? 'text-violet-300/90' : 'text-[#3F258B]'
                        }`}
                      >
                        Select SKU
                      </p>
                      <p className={`text-base font-black ${dark ? 'text-white' : 'text-slate-900'}`}>
                        {pickCategory}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSkuSheetOpen(false)}
                      className={`text-xs font-bold px-3 py-2 rounded-xl ${
                        dark ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      Close
                    </button>
                  </div>
                  <div className="px-4 pb-3">
                    <input
                      value={skuSearch}
                      onChange={(e) => setSkuSearch(e.target.value)}
                      placeholder="Search product name…"
                      className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold outline-none border ${
                        dark
                          ? 'bg-slate-900 border-white/10 text-white placeholder:text-slate-500'
                          : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
                      }`}
                      autoFocus
                    />
                  </div>
                  <div className="flex-1 overflow-y-auto px-3 pb-6 space-y-1.5">
                    {filteredSkus.length === 0 && (
                      <p className={`text-sm text-center py-8 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
                        No SKUs match
                      </p>
                    )}
                    {filteredSkus.map((p) => {
                      const active = String(pickProductId) === String(p._id);
                      return (
                        <button
                          key={p._id}
                          type="button"
                          onClick={() => {
                            setPickProductId(p._id);
                            setSkuSheetOpen(false);
                            setSkuSearch('');
                          }}
                          className={`w-full text-left rounded-2xl px-3.5 py-3.5 flex items-center gap-3 border transition ${
                            active
                              ? dark
                                ? 'bg-violet-500/20 border-violet-400/40'
                                : 'bg-violet-50 border-[#3F258B]/35'
                              : dark
                              ? 'bg-slate-900/70 border-white/8'
                              : 'bg-white border-slate-150 shadow-sm'
                          }`}
                          style={
                            active
                              ? {
                                  boxShadow: dark
                                    ? '0 8px 24px rgba(171,107,240,0.25)'
                                    : '0 8px 24px rgba(63,37,139,0.12)',
                                }
                              : dark
                              ? undefined
                              : {
                                  boxShadow:
                                    '0 1px 0 rgba(255,255,255,1) inset, 0 6px 16px rgba(15,23,42,0.06)',
                                }
                          }
                        >
                          <div
                            className={`w-11 h-11 rounded-xl shrink-0 flex items-center justify-center overflow-hidden border ${
                              dark ? 'border-white/10 bg-slate-800' : 'border-slate-200 bg-slate-50'
                            }`}
                          >
                            {p.image ? (
                              <img src={p.image} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-lg">{catMeta[pickCategory]?.icon || '🧴'}</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className={`text-sm font-bold leading-snug ${dark ? 'text-white' : 'text-slate-900'}`}>
                              {p.name}
                            </div>
                            <div className={`text-[11px] font-semibold mt-0.5 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                              {p.size || pickCategory}
                              {p.pricePc != null ? ` · GHS ${Number(p.pricePc).toFixed(2)}` : ''}
                            </div>
                          </div>
                          <div
                            className={`w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center ${
                              active
                                ? 'border-transparent text-white'
                                : dark
                                ? 'border-slate-600'
                                : 'border-slate-300'
                            }`}
                            style={
                              active
                                ? { background: 'linear-gradient(145deg, #5b3aad, #3F258B)' }
                                : undefined
                            }
                          >
                            {active ? '✓' : ''}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {selectedProduct && (
              <div
                className={`flex items-center gap-3 rounded-2xl p-2.5 border ${
                  dark
                    ? 'border-teal-500/20 bg-teal-500/5'
                    : 'border-teal-200/80 bg-gradient-to-r from-teal-50 to-sky-50'
                }`}
              >
                <div
                  className={`w-14 h-14 rounded-2xl overflow-hidden shrink-0 flex items-center justify-center border shadow-inner ${
                    dark ? 'border-white/10 bg-slate-900' : 'border-white bg-white shadow-sm'
                  }`}
                >
                  {selectedProduct.image ? (
                    <img src={selectedProduct.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl">🧴</span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className={`text-sm font-bold truncate ${dark ? 'text-white' : 'text-slate-800'}`}>
                    {selectedProduct.name}
                  </div>
                  <div className={`text-[11px] font-medium ${dark ? 'text-teal-400/80' : 'text-teal-700'}`}>
                    {selectedProduct.size || selectedProduct.category}
                  </div>
                </div>
              </div>
            )}

            {selectedProduct && (
              <div>
                <label className={`${labelXs} uppercase tracking-wider`}>Unit</label>
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
                      className={`py-3 rounded-2xl text-xs font-extrabold border transition ${
                        pickUnit === u.id ? pillActive : pillIdle
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
                  <label className={`${labelXs} uppercase tracking-wider`}>Quantity</label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPickQty(String(Math.max(1, Number(pickQty || 1) - 1)))}
                      className={`w-11 h-11 rounded-2xl font-bold text-lg border ${pillIdle}`}
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={pickQty}
                      onChange={(e) => setPickQty(e.target.value)}
                      className={`${inputSm} text-center font-extrabold text-base`}
                    />
                    <button
                      type="button"
                      onClick={() => setPickQty(String(Number(pickQty || 1) + 1))}
                      className={`w-11 h-11 rounded-2xl font-bold text-lg border ${pillIdle}`}
                    >
                      +
                    </button>
                  </div>
                </div>
                <div>
                  <label className={`${labelXs} uppercase tracking-wider`}>Price (GHS)</label>
                  <div
                    className={`rounded-2xl px-3 py-3 text-sm font-extrabold border ${
                      dark
                        ? 'border-white/10 bg-white/5 text-white'
                        : 'border-slate-200 bg-slate-50 text-slate-900'
                    }`}
                  >
                    {Number(unitPrice(selectedProduct, pickUnit) || 0).toFixed(2)}
                    <span className={`text-[10px] font-semibold ml-1 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                      / {pickUnit}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {selectedProduct && (
              <div>
                <label className={`${labelXs} uppercase tracking-wider`}>Payment</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, paymentType: 'cash' })}
                    className={`py-3 rounded-2xl text-sm font-bold border flex items-center justify-center gap-2 transition ${
                      form.paymentType === 'cash' ? pillActive : pillIdle
                    }`}
                  >
                    <span>💵</span> Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, paymentType: 'credit' })}
                    className={`py-3 rounded-2xl text-sm font-bold border flex items-center justify-center gap-2 transition ${
                      form.paymentType === 'credit' ? pillActive : pillIdle
                    }`}
                  >
                    <span>💳</span> Credit
                  </button>
                </div>
                {form.paymentType === 'credit' && (
                  <select
                    value={form.creditDurationWeeks}
                    onChange={(e) => setForm({ ...form, creditDurationWeeks: e.target.value })}
                    className={`${inputSm} mt-2.5`}
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
                className="w-full py-3.5 rounded-2xl text-sm font-extrabold text-white flex items-center justify-center gap-2 bg-gradient-to-r from-[#0d9488] to-[#117ea6] shadow-lg shadow-teal-500/30 active:scale-[0.98] transition"
              >
                <span>🛒</span> Add to cart
              </button>
            )}
          </div>
        )}

        {/* CARD 4 — Cart */}
        {(form.outcome === 'Order Placed' || isCallback || extraCoverage) && cart.length > 0 && (
          <div className={`rounded-3xl p-4 space-y-2.5 ${glass}`}>
            <div className="flex items-center justify-between">
              <h3 className={`text-sm font-extrabold ${dark ? 'text-white' : 'text-slate-900'}`}>
                Order cart
                <span className="ml-2 text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-400">
                  {cart.length}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setCart([])}
                className="text-[11px] font-bold text-rose-400/90 hover:text-rose-400"
              >
                Clear all
              </button>
            </div>
            {cart.map((i, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-3 rounded-2xl p-2.5 border ${
                  dark
                    ? 'border-white/10 bg-white/5'
                    : 'border-slate-100 bg-gradient-to-r from-slate-50 to-white'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-xl overflow-hidden shrink-0 flex items-center justify-center border ${
                    dark ? 'border-white/10 bg-slate-900' : 'border-slate-200 bg-white shadow-sm'
                  }`}
                >
                  {i.image ? (
                    <img src={i.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg">🧴</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-bold truncate ${dark ? 'text-white' : 'text-slate-800'}`}>
                    {i.productName}
                  </div>
                  <div className={`text-[10px] font-medium ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {String(i.unit).toUpperCase()} · {i.quantity} × GHS {Number(i.unitPrice).toFixed(2)}
                  </div>
                </div>
                <span className="text-xs font-extrabold text-emerald-400 shrink-0">
                  GHS {i.lineTotal.toFixed(2)}
                </span>
                <button
                  type="button"
                  onClick={() => removeLine(idx)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-sm bg-rose-500/10 text-rose-400 border border-rose-500/20"
                  title="Remove"
                >
                  🗑️
                </button>
              </div>
            ))}
            <div
              className={`flex justify-between items-center mt-1 pt-3 border-t ${
                dark ? 'border-white/10' : 'border-slate-100'
              }`}
            >
              <span className={`text-[11px] font-bold uppercase tracking-wider ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                Total
              </span>
              <span className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
                GHS {cartTotal.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {form.outcome === 'No Order' && (
          <div className={`rounded-3xl p-4 space-y-3 ${glass}`}>
            <div>
              <h3 className={`text-sm font-extrabold ${dark ? 'text-white' : 'text-slate-900'}`}>
                No order
              </h3>
              <p className={`text-[11px] mt-1 font-medium ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                Select a reason below.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {NO_ORDER_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setForm({ ...form, noOrderReason: r })}
                  className={`text-[11px] font-bold px-3.5 py-2.5 rounded-2xl border transition ${
                    form.noOrderReason === r ? pillActive : pillIdle
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={`rounded-3xl p-4 ${glass}`}>
          <label className={`${labelCls} !mb-2`}>Notes (optional)</label>
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
            className={`text-sm px-4 py-3.5 rounded-2xl border font-semibold ${
              status.type === 'success'
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : 'bg-red-500/15 text-red-400 border-red-500/30'
            }`}
          >
            {status.msg}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            disabled={loading || cart.length === 0}
            onClick={() => {
              setInvoiceBeforeSave(false);
              setInvoicePreview(buildInvoiceData());
            }}
            className={`py-4 rounded-2xl text-sm font-extrabold border flex items-center justify-center gap-2 transition disabled:opacity-40 ${
              dark
                ? 'bg-slate-800/90 text-white border-white/10 hover:bg-slate-700'
                : 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/20'
            }`}
          >
            <span>🖨️</span> Print invoice
          </button>
          <button
            type="submit"
            disabled={loading}
            className="py-4 rounded-2xl text-sm font-extrabold text-white disabled:opacity-60 flex items-center justify-center gap-2 active:scale-[0.98] transition"
            style={{
              background: 'linear-gradient(145deg, #34d399, #059669 55%, #047857)',
              boxShadow: '0 14px 36px rgba(5,150,105,0.4)',
            }}
          >
            <span>✓</span> {loading ? 'Saving…' : 'Complete visit'}
          </button>
        </div>
      </form>
    </div>
  );
}
