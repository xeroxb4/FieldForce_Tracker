import { useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function DayWrapUp() {
  const { user } = useAuth();
  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    date: today,
    shopsPlanned: '',
    shopsVisited: '',
    shopNames: '',
    ordersCount: '',
    totalAmount: '',
    notes: '',
  });
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAutoFill = async () => {
    setAutoLoading(true);
    setStatus(null);
    try {
      const { data } = await api.get(`/omr/visits/today?date=${form.date}`);
      const orders = data.filter((v) => v.outcome === 'Order Placed');
      const total = data.reduce((sum, v) => sum + (v.amount || 0), 0);
      const names = data.map((v) => v.shopName).join('\n');

      setForm((prev) => ({
        ...prev,
        shopsVisited: String(data.length),
        shopNames: names,
        ordersCount: String(orders.length),
        totalAmount: total ? String(total) : '',
      }));

      setStatus({
        type: 'success',
        msg: data.length
          ? `Pulled ${data.length} shop visit(s) logged today.`
          : 'No visits found for this date.',
      });
    } catch (err) {
      setStatus({
        type: 'error',
        msg: err.response?.data?.message || 'Could not pull today\'s visits',
      });
    } finally {
      setAutoLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      await api.post('/omr/wrapups', {
        date: form.date,
        shopsPlanned: Number(form.shopsPlanned) || 0,
        shopsVisited: Number(form.shopsVisited) || 0,
        shopNames: form.shopNames
          ? form.shopNames.split('\n').map((s) => s.trim()).filter(Boolean)
          : [],
        ordersCount: Number(form.ordersCount) || 0,
        totalAmount: Number(form.totalAmount) || 0,
        notes: form.notes,
      });
      setStatus({ type: 'success', msg: 'Day wrap-up submitted successfully!' });
    } catch (err) {
      setStatus({
        type: 'error',
        msg: err.response?.data?.message || 'Failed to submit wrap-up',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-lg font-bold text-slate-800 mb-1">Day Wrap-Up</h2>
      <p className="text-sm text-slate-500 mb-4">End-of-day summary</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
          <input
            type="date"
            name="date"
            value={form.date}
            onChange={handleChange}
            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Territory</label>
            <input
              value={user?.territory || ''}
              disabled
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-slate-50 text-slate-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Distributor</label>
            <input
              value={user?.distributor || ''}
              disabled
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-slate-50 text-slate-500"
            />
          </div>
        </div>

        {/* Auto-fill button */}
        <button
          type="button"
          onClick={handleAutoFill}
          disabled={autoLoading}
          className="w-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium py-3 rounded-xl hover:bg-emerald-100 transition disabled:opacity-60"
        >
          {autoLoading ? 'Pulling today\'s visits…' : 'Auto-fill from today\'s shop visits'}
        </button>

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

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Shops Planned</label>
          <input
            name="shopsPlanned"
            type="number"
            value={form.shopsPlanned}
            onChange={handleChange}
            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
            placeholder="0"
            min="0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Shops Visited *</label>
          <input
            name="shopsVisited"
            type="number"
            value={form.shopsVisited}
            onChange={handleChange}
            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
            placeholder="0"
            min="0"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Shop Names <span className="text-slate-400 font-normal">(one per line)</span>
          </label>
          <textarea
            name="shopNames"
            value={form.shopNames}
            onChange={handleChange}
            rows={4}
            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
            placeholder="List every shop by name"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Orders</label>
            <input
              name="ordersCount"
              type="number"
              value={form.ordersCount}
              onChange={handleChange}
              className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
              placeholder="0"
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Total Amount</label>
            <input
              name="totalAmount"
              type="number"
              value={form.totalAmount}
              onChange={handleChange}
              className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
              placeholder="0"
              min="0"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            rows={2}
            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
            placeholder="Optional"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-navy text-white font-semibold py-3.5 rounded-xl hover:bg-slate-800 transition disabled:opacity-60"
        >
          {loading ? 'Submitting...' : 'Submit Day Wrap-Up'}
        </button>
      </form>
    </div>
  );
}
