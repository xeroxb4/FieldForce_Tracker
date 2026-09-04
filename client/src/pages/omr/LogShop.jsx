import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';

const OUTCOMES = ['Order Placed', 'No Order', 'Shop Closed', 'Not Interested', 'Follow Up', 'Other'];
const CATEGORIES = ['Lotion', 'Roll-on', 'Spray'];

export default function LogShop() {
  const location = useLocation();
  const navigate = useNavigate();
  const ctx = location.state || {};

  const [form, setForm] = useState({
    shopName: ctx.shopName || '',
    contactName: ctx.contactName || '',
    contactPhone: ctx.contactPhone || '',
    outcome: 'No Order',
    notes: '',
  });
  const [products, setProducts] = useState({});
  const [activeCat, setActiveCat] = useState('Lotion');
  const [cart, setCart] = useState([]); // { skuId, productName, category, size, unit, quantity, unitPrice, lineTotal }
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const fromBeat = !!ctx.fromBeat && !!ctx.outletId;

  useEffect(() => {
    api
      .get('/omr/products')
      .then((res) => setProducts(res.data))
      .catch(() => {});
  }, []);

  const addToCart = (sku, unit) => {
    const price =
      unit === 'pack' ? sku.pricePack : unit === 'carton' ? sku.priceCarton : sku.pricePc;
    setCart((prev) => {
      const existing = prev.find((i) => i.skuId === sku._id && i.unit === unit);
      if (existing) {
        return prev.map((i) =>
          i.skuId === sku._id && i.unit === unit
            ? {
                ...i,
                quantity: i.quantity + 1,
                lineTotal: (i.quantity + 1) * i.unitPrice,
              }
            : i
        );
      }
      return [
        ...prev,
        {
          skuId: sku._id,
          productName: sku.name,
          category: sku.category,
          size: sku.size,
          unit,
          quantity: 1,
          unitPrice: price,
          lineTotal: price,
        },
      ];
    });
  };

  const updateQty = (skuId, unit, qty) => {
    const q = Math.max(0, Number(qty) || 0);
    setCart((prev) =>
      prev
        .map((i) =>
          i.skuId === skuId && i.unit === unit
            ? { ...i, quantity: q, lineTotal: q * i.unitPrice }
            : i
        )
        .filter((i) => i.quantity > 0)
    );
  };

  const cartTotal = cart.reduce((s, i) => s + i.lineTotal, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.shopName.trim()) {
      setStatus({ type: 'error', msg: 'Shop name is required' });
      return;
    }

    setLoading(true);
    setStatus(null);

    const submit = async (gpsLoc) => {
      try {
        await api.post('/omr/visits', {
          shopName: form.shopName,
          outletId: ctx.outletId,
          contactName: form.contactName,
          contactPhone: form.contactPhone,
          outcome: form.outcome,
          lineItems: cart,
          amount: cartTotal,
          notes: form.notes,
          date: new Date().toISOString().slice(0, 10),
          location: gpsLoc,
          outletLocation: ctx.outletLocation,
          distanceMeters: ctx.distanceMeters,
        });
        setStatus({ type: 'success', msg: 'Shop visit logged successfully!' });
        setCart([]);
        if (fromBeat) {
          setTimeout(() => navigate('/omr/beats'), 1200);
        } else {
          setForm({
            shopName: '',
            contactName: '',
            contactPhone: '',
            outcome: 'No Order',
            notes: '',
          });
        }
      } catch (err) {
        setStatus({ type: 'error', msg: err.response?.data?.message || 'Failed to log visit' });
      } finally {
        setLoading(false);
      }
    };

    // Outlet visits always need fresh GPS
    if (fromBeat || ctx.outletId) {
      if (!navigator.geolocation) {
        setStatus({ type: 'error', msg: 'GPS required. Turn on location.' });
        setLoading(false);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          submit({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          }),
        () => {
          setStatus({ type: 'error', msg: 'Turn on GPS to complete this outlet visit.' });
          setLoading(false);
        },
        { enableHighAccuracy: true, timeout: 15000 }
      );
    } else {
      submit(ctx.agentLocation || undefined);
    }
  };

  const list = products[activeCat] || [];

  return (
    <div>
      <h2 className="text-lg font-bold text-slate-800 mb-1">
        {fromBeat ? 'Service Outlet' : 'Log Shop'}
      </h2>
      <p className="text-sm text-slate-500 mb-4">
        {fromBeat
          ? `${form.shopName} · Location verified`
          : 'Record a visit (prefer starting from Today\'s Beat)'}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Shop Name *</label>
          <input
            name="shopName"
            value={form.shopName}
            onChange={(e) => setForm({ ...form, shopName: e.target.value })}
            disabled={fromBeat}
            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy disabled:bg-slate-50"
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

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Outcome</label>
          <select
            value={form.outcome}
            onChange={(e) => setForm({ ...form, outcome: e.target.value })}
            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm bg-white"
          >
            {OUTCOMES.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>

        {/* Products */}
        {form.outcome === 'Order Placed' && (
          <div className="border border-slate-200 rounded-xl p-3 bg-white">
            <div className="text-sm font-medium text-slate-700 mb-2">Add products (PC / Pack / Carton)</div>
            <div className="flex gap-1 overflow-x-auto pb-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCat(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                    activeCat === cat ? 'bg-navy text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {list.map((sku) => (
                <div key={sku._id} className="border border-slate-100 rounded-lg p-2">
                  <div className="text-xs font-medium text-slate-800">{sku.name}</div>
                  <div className="text-[10px] text-slate-400 mb-1">{sku.size}</div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => addToCart(sku, 'pc')}
                      className="flex-1 text-[10px] bg-slate-100 rounded px-1 py-1"
                    >
                      + PC (GHS {sku.pricePc})
                    </button>
                    <button
                      type="button"
                      onClick={() => addToCart(sku, 'pack')}
                      className="flex-1 text-[10px] bg-slate-100 rounded px-1 py-1"
                    >
                      + Pack (GHS {sku.pricePack})
                    </button>
                    <button
                      type="button"
                      onClick={() => addToCart(sku, 'carton')}
                      className="flex-1 text-[10px] bg-slate-100 rounded px-1 py-1"
                    >
                      + Carton (GHS {sku.priceCarton})
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {cart.length > 0 && (
              <div className="mt-3 border-t border-slate-100 pt-2 space-y-1">
                <div className="text-xs font-medium text-slate-600">Order</div>
                {cart.map((i) => (
                  <div key={`${i.skuId}-${i.unit}`} className="flex items-center gap-2 text-xs">
                    <span className="flex-1 truncate">
                      {i.productName} ({i.unit})
                    </span>
                    <input
                      type="number"
                      min="1"
                      value={i.quantity}
                      onChange={(e) => updateQty(i.skuId, i.unit, e.target.value)}
                      className="w-14 border rounded px-1 py-0.5"
                    />
                    <span className="w-16 text-right">GHS {i.lineTotal.toFixed(2)}</span>
                  </div>
                ))}
                <div className="text-sm font-bold text-navy text-right pt-1">
                  Total: GHS {cartTotal.toFixed(2)}
                </div>
              </div>
            )}
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
          {loading ? 'Saving...' : 'Complete Visit'}
        </button>
      </form>
    </div>
  );
}
