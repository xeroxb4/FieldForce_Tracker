import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

const CATEGORIES = ['Roll-on', 'Spray', 'Lotion', 'Shower Gel', 'Other'];

export default function MerchVisit() {
  const { dark } = useTheme();
  const [shopName, setShopName] = useState('');
  const [skus, setSkus] = useState({});
  const [entries, setEntries] = useState({});
  const [activeCat, setActiveCat] = useState('Roll-on');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingSkus, setLoadingSkus] = useState(true);

  const inputCls = `w-full rounded-xl px-4 py-3 text-sm border outline-none focus:ring-2 focus:ring-indigo-500 ${
    dark
      ? 'bg-slate-900 border-slate-600 text-white placeholder:text-slate-500'
      : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
  }`;
  const labelCls = `block text-sm font-medium mb-1 ${dark ? 'text-slate-200' : 'text-slate-700'}`;
  const cardCls = `rounded-xl border p-3 ${
    dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
  }`;

  useEffect(() => {
    api
      .get('/merchandiser/skus')
      .then((res) => setSkus(res.data))
      .catch(() => setStatus({ type: 'error', msg: 'Failed to load SKUs' }))
      .finally(() => setLoadingSkus(false));
  }, []);

  const updateEntry = (skuId, field, value) => {
    setEntries((prev) => ({
      ...prev,
      [skuId]: { ...prev[skuId], [field]: value },
    }));
  };

  const toggleAvailable = (skuId) => {
    setEntries((prev) => ({
      ...prev,
      [skuId]: {
        ...prev[skuId],
        available: !(prev[skuId]?.available ?? true),
      },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!shopName.trim()) {
      setStatus({ type: 'error', msg: 'Shop name is required' });
      return;
    }

    const skuEntries = Object.entries(entries).map(([skuId, data]) => {
      let skuName = '';
      let category = '';
      for (const cat of CATEGORIES) {
        const found = (skus[cat] || []).find((s) => s._id === skuId);
        if (found) {
          skuName = found.name;
          category = found.category;
          break;
        }
      }
      return {
        skuId,
        skuName,
        category,
        available: data.available ?? true,
        facings: Number(data.facings) || 0,
        price: Number(data.price) || 0,
        orderQty: Number(data.orderQty) || 0,
        notes: data.notes || '',
      };
    });

    setLoading(true);
    setStatus(null);
    try {
      await api.post('/merchandiser/visits', {
        shopName,
        date: new Date().toISOString().slice(0, 10),
        skuEntries,
        overallNotes: notes,
      });
      setStatus({ type: 'success', msg: 'Merchandiser visit logged successfully!' });
      setShopName('');
      setEntries({});
      setNotes('');
    } catch (err) {
      setStatus({ type: 'error', msg: err.response?.data?.message || 'Failed to save visit' });
    } finally {
      setLoading(false);
    }
  };

  const currentSkus = skus[activeCat] || [];

  return (
    <div>
      <h2 className={`text-lg font-bold mb-1 ${dark ? 'text-white' : 'text-slate-800'}`}>
        New Merchandiser Visit
      </h2>
      <p className={`text-sm mb-4 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
        Record Nivea SKU availability
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls}>Shop Name *</label>
          <input
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            className={inputCls}
            placeholder="Enter shop name"
            required
          />
        </div>

        <div className="flex gap-1 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCat(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                activeCat === cat
                  ? 'bg-indigo-600 text-white'
                  : dark
                  ? 'bg-slate-800 text-slate-300'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {loadingSkus ? (
          <p className={`text-sm ${dark ? 'text-slate-400' : 'text-slate-400'}`}>Loading SKUs...</p>
        ) : currentSkus.length === 0 ? (
          <p className={`text-sm ${dark ? 'text-slate-400' : 'text-slate-400'}`}>
            No SKUs in this category
          </p>
        ) : (
          <div className="space-y-3">
            {currentSkus.map((sku) => {
              const entry = entries[sku._id] || {};
              const available = entry.available ?? true;
              return (
                <div key={sku._id} className={cardCls}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className={`text-sm font-medium ${dark ? 'text-white' : 'text-slate-800'}`}>
                        {sku.name}
                      </div>
                      <div className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-400'}`}>
                        {sku.skuCode} · {sku.size}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleAvailable(sku._id)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-medium border ${
                        available
                          ? 'bg-green-500/10 text-green-500 border-green-500/30'
                          : 'bg-red-500/10 text-red-400 border-red-500/30'
                      }`}
                    >
                      {available ? 'In Stock' : 'OOS'}
                    </button>
                  </div>

                  {available && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {[
                        { key: 'facings', label: 'Facings' },
                        { key: 'price', label: 'Price' },
                        { key: 'orderQty', label: 'Order Qty' },
                      ].map((f) => (
                        <div key={f.key}>
                          <label className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {f.label}
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={entry[f.key] || ''}
                            onChange={(e) => updateEntry(sku._id, f.key, e.target.value)}
                            className={`w-full rounded-lg px-2 py-1.5 text-sm border ${
                              dark
                                ? 'bg-slate-900 border-slate-600 text-white'
                                : 'bg-white border-slate-200 text-slate-900'
                            }`}
                            placeholder="0"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div>
          <label className={labelCls}>Overall Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className={inputCls}
            placeholder="Optional notes about this shop"
          />
        </div>

        {status && (
          <div
            className={`text-sm px-4 py-3 rounded-xl border ${
              status.type === 'success'
                ? 'bg-green-500/10 text-green-500 border-green-500/20'
                : 'bg-red-500/10 text-red-500 border-red-500/20'
            }`}
          >
            {status.msg}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white font-semibold py-3.5 rounded-xl hover:bg-indigo-700 transition disabled:opacity-60"
        >
          {loading ? 'Saving...' : 'Save Merchandiser Visit'}
        </button>
      </form>
    </div>
  );
}
