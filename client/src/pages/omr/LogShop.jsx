import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../services/api';

const OUTCOMES = ['Order Placed', 'No Order', 'Shop Closed', 'Not Interested', 'Follow Up', 'Other'];

export default function LogShop() {
  const location = useLocation();
  const prefillShop = location.state?.shopName || '';

  const [form, setForm] = useState({
    shopName: prefillShop,
    contactName: '',
    contactPhone: '',
    outcome: 'No Order',
    products: '',
    amount: '',
    notes: '',
  });
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.shopName.trim()) {
      setStatus({ type: 'error', msg: 'Shop name is required' });
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      await api.post('/omr/visits', {
        ...form,
        amount: Number(form.amount) || 0,
        date: new Date().toISOString().slice(0, 10),
      });
      setStatus({ type: 'success', msg: 'Shop visit logged successfully!' });
      setForm({
        shopName: '',
        contactName: '',
        contactPhone: '',
        outcome: 'No Order',
        products: '',
        amount: '',
        notes: '',
      });
    } catch (err) {
      setStatus({ type: 'error', msg: err.response?.data?.message || 'Failed to log visit' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-lg font-bold text-slate-800 mb-1">Log Shop</h2>
      <p className="text-sm text-slate-500 mb-4">Record every shop you visit today</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Shop Name *</label>
          <input
            name="shopName"
            value={form.shopName}
            onChange={handleChange}
            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
            placeholder="Enter shop name"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contact Name</label>
            <input
              name="contactName"
              value={form.contactName}
              onChange={handleChange}
              className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
              placeholder="Optional"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
            <input
              name="contactPhone"
              value={form.contactPhone}
              onChange={handleChange}
              className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
              placeholder="Optional"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Outcome</label>
          <select
            name="outcome"
            value={form.outcome}
            onChange={handleChange}
            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy bg-white"
          >
            {OUTCOMES.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Products</label>
          <input
            name="products"
            value={form.products}
            onChange={handleChange}
            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
            placeholder="e.g. Roll-on, Lotion"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Amount (GHS)</label>
          <input
            name="amount"
            type="number"
            value={form.amount}
            onChange={handleChange}
            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
            placeholder="0"
            min="0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            rows={2}
            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
            placeholder="Optional notes"
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
          {loading ? 'Saving...' : 'Log Shop Visit'}
        </button>
      </form>
    </div>
  );
}
