import { useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function DayWrapUp() {
  const { user } = useAuth();
  const { dark } = useTheme();
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

  const inputCls = `w-full rounded-xl px-4 py-3 text-sm border-2 font-medium outline-none focus:ring-2 focus:ring-[#2596be] ${
    dark
      ? 'bg-slate-900 border-slate-600 text-white placeholder:text-slate-500'
      : 'bg-white border-[#2596be]/50 text-slate-900 placeholder:text-slate-400'
  }`;
  const labelCls = `block text-sm font-bold mb-1 ${dark ? 'text-slate-200' : 'text-slate-800'}`;

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
        msg: err.response?.data?.message || "Could not pull today's visits",
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
      <h2 className={`text-lg font-bold mb-1 ${dark ? 'text-white' : 'text-slate-900'}`}>
        Day Wrap-Up
      </h2>
      <p className={`text-sm mb-4 font-medium ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
        End-of-day summary · {user?.fullName}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls}>Date</label>
          <input
            type="date"
            name="date"
            value={form.date}
            onChange={handleChange}
            className={inputCls}
          />
        </div>

        <button
          type="button"
          onClick={handleAutoFill}
          disabled={autoLoading}
          className="w-full py-2.5 rounded-xl border-2 border-[#2596be] text-[#2596be] font-bold text-sm hover:bg-[#2596be]/10 disabled:opacity-60"
        >
          {autoLoading ? 'Pulling visits…' : 'Auto-fill from today’s visits'}
        </button>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Shops planned</label>
            <input
              type="number"
              name="shopsPlanned"
              value={form.shopsPlanned}
              onChange={handleChange}
              className={inputCls}
              min="0"
            />
          </div>
          <div>
            <label className={labelCls}>Shops visited</label>
            <input
              type="number"
              name="shopsVisited"
              value={form.shopsVisited}
              onChange={handleChange}
              className={inputCls}
              min="0"
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>Shop names (one per line)</label>
          <textarea
            name="shopNames"
            value={form.shopNames}
            onChange={handleChange}
            rows={4}
            className={inputCls}
            placeholder="Outlet names visited…"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Orders count</label>
            <input
              type="number"
              name="ordersCount"
              value={form.ordersCount}
              onChange={handleChange}
              className={inputCls}
              min="0"
            />
          </div>
          <div>
            <label className={labelCls}>Total amount (GHS)</label>
            <input
              type="number"
              name="totalAmount"
              value={form.totalAmount}
              onChange={handleChange}
              className={inputCls}
              min="0"
              step="0.01"
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>Notes</label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            rows={3}
            className={inputCls}
            placeholder="Challenges, competitor activity, next actions…"
          />
        </div>

        {status && (
          <div
            className={`text-sm px-4 py-3 rounded-xl border-2 font-medium ${
              status.type === 'success'
                ? 'bg-green-50 text-green-700 border-green-300'
                : 'bg-red-50 text-red-700 border-red-300'
            }`}
          >
            {status.msg}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#2596be] text-white font-bold py-3.5 rounded-xl disabled:opacity-60 shadow-md"
        >
          {loading ? 'Submitting…' : 'Submit wrap-up'}
        </button>
      </form>
    </div>
  );
}
