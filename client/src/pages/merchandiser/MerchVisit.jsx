import { useState, useEffect } from 'react';
import api from '../../services/api';

const CATEGORIES = ['Roll-on', 'Spray', 'Lotion', 'Shower Gel', 'Other'];

export default function MerchVisit() {
  const [shopName, setShopName] = useState('');
  const [skus, setSkus] = useState({});
  const [entries, setEntries] = useState({});
  const [activeCat, setActiveCat] = useState('Roll-on');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingSkus, setLoadingSkus] = useState(true);

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
      [skuId]: {
        ...prev[skuId],
        [field]: value,
      },
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
      // Find sku details
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
      <h2 className="text-lg font-bold text-slate-800 mb-1">New Merchandiser Visit</h2>
      <p className="text-sm text-slate-500 mb-4">Record Nivea SKU availability</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Shop Name *</label>
          <input
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
            placeholder="Enter shop name"
            required
          />
        </div>

        {/* Category tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCat(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                activeCat === cat
                  ? 'bg-navy text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {loadingSkus ? (
          <p className="text-sm text-slate-400">Loading SKUs...</p>
        ) : currentSkus.length === 0 ? (
          <p className="text-sm text-slate-400">No SKUs in this category</p>
        ) : (
          <div className="space-y-3">
            {currentSkus.map((sku) => {
              const entry = entries[sku._id] || {};
              const available = entry.available ?? true;
              return (
                <div key={sku._id} className="bg-white border border-slate-200 rounded-xl p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="text-sm font-medium text-slate-800">{sku.name}</div>
                      <div className="text-xs text-slate-400">{sku.skuCode} · {sku.size}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleAvailable(sku._id)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-medium ${
                        available
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}
                    >
                      {available ? 'In Stock' : 'OOS'}
                    </button>
                  </div>

                  {available && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <div>
                        <label className="text-xs text-slate-500">Facings</label>
                        <input
                          type="number"
                          min="0"
                          value={entry.facings || ''}
                          onChange={(e) => updateEntry(sku._id, 'facings', e.target.value)}
                          className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500">Price</label>
                        <input
                          type="number"
                          min="0"
                          value={entry.price || ''}
                          onChange={(e) => updateEntry(sku._id, 'price', e.target.value)}
                          className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500">Order Qty</label>
                        <input
                          type="number"
                          min="0"
                          value={entry.orderQty || ''}
                          onChange={(e) => updateEntry(sku._id, 'orderQty', e.target.value)}
                          className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Overall Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
            placeholder="Optional notes about this shop"
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
          className="w-full bg-navy text-white font-semibold py-3.5 rounded-xl hover:bg-slate-800 transition disabled:opacity-60"
        >
          {loading ? 'Saving...' : 'Save Merchandiser Visit'}
        </button>
      </form>
    </div>
  );
}
