import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api, { isOnline } from '../../services/api';
import {
  cacheProducts,
  getCachedProducts,
  enqueue,
  syncQueue,
  queueCount,
} from '../../services/offline';

const OUTCOMES = ['Order Placed', 'No Order', 'Shop Closed', 'Follow Up', 'Other'];
const NO_ORDER_REASONS = [
  'Out of cash',
  'Owner not available',
  'I have a supplier',
  'High price',
  'Shop closed',
  'Not interested',
  'Stock still available',
  'Other',
];
const CATEGORIES = ['Lotion', 'Roll-on', 'Spray'];

export default function LogShop() {
  const location = useLocation();
  const navigate = useNavigate();
  const ctx = location.state || {};
  const fromBeat = !!ctx.fromBeat && !!ctx.outletId;

  const [form, setForm] = useState({
    shopName: ctx.shopName || '',
    contactName: ctx.contactName || '',
    contactPhone: ctx.contactPhone || '',
    outcome: 'Order Placed',
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
    outcome: form.outcome,
    noOrderReason: form.outcome === 'No Order' ? form.noOrderReason : '',
    lineItems: form.outcome === 'Order Placed' ? cart : [],
    amount: form.outcome === 'Order Placed' ? cartTotal : 0,
    paymentType: form.outcome === 'Order Placed' ? form.paymentType : '',
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
    if (form.outcome === 'Order Placed' && cart.length === 0) {
      setStatus({ type: 'error', msg: 'Add at least one product for an order' });
      return;
    }
    if (form.outcome === 'Order Placed' && form.paymentType === 'credit') {
      if (!['1', '2'].includes(String(form.creditDurationWeeks))) {
        setStatus({ type: 'error', msg: 'Select credit duration (1 or 2 weeks)' });
        return;
      }
    }

    setLoading(true);
    setStatus(null);

    const finishOk = (msg) => {
      setStatus({ type: 'success', msg });
      setCart([]);
      setOfflinePending(queueCount());
      if (fromBeat) setTimeout(() => navigate('/omr/beats'), 1200);
      setLoading(false);
    };

    const send = async (gpsLoc) => {
      const payload = buildPayload(gpsLoc);

      // Offline → queue
      if (!isOnline()) {
        enqueue({ type: 'visit', payload: { ...payload, syncedFromOffline: true } });
        finishOk('Saved offline. Will sync when network is back.');
        return;
      }

      try {
        await api.post('/omr/visits', payload);
        // Also flush any older queue
        await syncQueue(api);
        finishOk(
          form.paymentType === 'credit'
            ? 'Visit saved. Credit added to Owings.'
            : 'Shop visit logged successfully!'
        );
      } catch (err) {
        // Network error mid-request → queue
        if (!err.response) {
          enqueue({ type: 'visit', payload: { ...payload, syncedFromOffline: true } });
          finishOk('Network issue — saved offline. Will sync when online.');
        } else {
          setStatus({ type: 'error', msg: err.response?.data?.message || 'Failed to log visit' });
          setLoading(false);
        }
      }
    };

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

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-bold text-slate-800">
          {fromBeat ? 'Service Outlet' : 'Log Shop'}
        </h2>
        {!isOnline() && (
          <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium">
            Offline
          </span>
        )}
      </div>
      <p className="text-sm text-slate-500 mb-3">
        {fromBeat ? `${form.shopName} · GPS verified` : 'Complete the visit details'}
        {offlinePending > 0 && (
          <span className="text-amber-600"> · {offlinePending} pending sync</span>
        )}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Shop Name *</label>
          <input
            value={form.shopName}
            onChange={(e) => setForm({ ...form, shopName: e.target.value })}
            disabled={fromBeat}
            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm disabled:bg-slate-50"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contact</label>
            <input
              value={form.contactName}
              onChange={(e) => setForm({ ...form, contactName: e.target.value })}
              className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
            <input
              value={form.contactPhone}
              onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
              className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm"
            />
          </div>
        </div>

        {/* Outcome */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Outcome *</label>
          <select
            value={form.outcome}
            onChange={(e) => setForm({ ...form, outcome: e.target.value, noOrderReason: '' })}
            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm bg-white"
          >
            {OUTCOMES.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>

        {/* No Order reason */}
        {form.outcome === 'No Order' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Reason for No Order *
            </label>
            <select
              value={form.noOrderReason}
              onChange={(e) => setForm({ ...form, noOrderReason: e.target.value })}
              className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm bg-white"
              required
            >
              <option value="">Select reason...</option>
              {NO_ORDER_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Order: product picker */}
        {form.outcome === 'Order Placed' && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="text-sm font-medium text-slate-700">Add products</div>

            {/* 1. Category */}
            <div>
              <label className="block text-xs text-slate-500 mb-1">Category</label>
              <select
                value={pickCategory}
                onChange={(e) => {
                  setPickCategory(e.target.value);
                  setPickProductId('');
                  setPickUnit('pc');
                }}
                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm bg-white"
              >
                <option value="">Select category...</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Product */}
            {pickCategory && (
              <div>
                <label className="block text-xs text-slate-500 mb-1">Product</label>
                <select
                  value={pickProductId}
                  onChange={(e) => setPickProductId(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm bg-white"
                >
                  <option value="">Select product...</option>
                  {productList.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} ({p.size})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 3. Unit + Qty */}
            {selectedProduct && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Unit</label>
                  <select
                    value={pickUnit}
                    onChange={(e) => setPickUnit(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm bg-white"
                  >
                    <option value="pc">PC (GHS {selectedProduct.pricePc})</option>
                    <option value="pack">Pack (GHS {selectedProduct.pricePack})</option>
                    <option value="carton">Carton (GHS {selectedProduct.priceCarton})</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={pickQty}
                    onChange={(e) => setPickQty(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm"
                  />
                </div>
              </div>
            )}

            {selectedProduct && (
              <button
                type="button"
                onClick={addProductLine}
                className="w-full bg-slate-100 text-slate-800 text-sm font-medium py-2.5 rounded-xl border border-slate-200"
              >
                + Add to order
              </button>
            )}

            {/* Cart */}
            {cart.length > 0 && (
              <div className="border-t border-slate-100 pt-2 space-y-1">
                {cart.map((i, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs">
                    <span className="flex-1 truncate">
                      {i.productName} · {i.quantity} {i.unit}
                    </span>
                    <span className="font-medium">GHS {i.lineTotal.toFixed(2)}</span>
                    <button
                      type="button"
                      onClick={() => removeLine(idx)}
                      className="text-red-500 px-1"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <div className="text-sm font-bold text-navy text-right pt-1">
                  Total: GHS {cartTotal.toFixed(2)}
                </div>
              </div>
            )}

            {/* Payment */}
            <div className="border-t border-slate-100 pt-3 space-y-2">
              <label className="block text-xs text-slate-500">Payment</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, paymentType: 'cash' })}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border ${
                    form.paymentType === 'cash'
                      ? 'bg-navy text-white border-navy'
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  Cash
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, paymentType: 'credit' })}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border ${
                    form.paymentType === 'credit'
                      ? 'bg-navy text-white border-navy'
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  Credit
                </button>
              </div>
              {form.paymentType === 'credit' && (
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Credit duration</label>
                  <select
                    value={form.creditDurationWeeks}
                    onChange={(e) =>
                      setForm({ ...form, creditDurationWeeks: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm bg-white"
                  >
                    <option value="1">1 week</option>
                    <option value="2">2 weeks</option>
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Will appear under Owings with due-date countdown
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm"
          />
        </div>

        {status && (
          <div
            className={`text-sm px-4 py-3 rounded-xl border ${
              status.type === 'success'
                ? 'bg-green-50 text-green-700 border-green-200'
                : 'bg-red-50 text-red-700 border-red-200'
            }`}
          >
            {status.msg}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-navy text-white font-semibold py-3.5 rounded-xl disabled:opacity-60"
        >
          {loading ? 'Saving...' : isOnline() ? 'Complete Visit' : 'Save Offline'}
        </button>
      </form>
    </div>
  );
}
