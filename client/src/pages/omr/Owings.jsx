import { useState, useEffect } from 'react';
import api from '../../services/api';

function daysUntil(dueDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + 'T00:00:00');
  const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
  return diff;
}

export default function Owings() {
  const [credits, setCredits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    customerName: '',
    shopName: '',
    amount: '',
    dueDate: '',
    notes: '',
  });
  const [status, setStatus] = useState(null);
  const [collecting, setCollecting] = useState(null);

  const load = () => {
    setLoading(true);
    api
      .get('/credits')
      .then((res) => setCredits(res.data))
      .catch(() => setStatus({ type: 'error', msg: 'Failed to load owings' }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setStatus(null);
    try {
      await api.post('/credits', form);
      setStatus({ type: 'success', msg: 'Credit / owing recorded' });
      setForm({ customerName: '', shopName: '', amount: '', dueDate: '', notes: '' });
      setShowForm(false);
      load();
    } catch (err) {
      setStatus({ type: 'error', msg: err.response?.data?.message || 'Failed to save' });
    }
  };

  const handleCollect = async (id) => {
    setCollecting(id);
    try {
      await api.patch(`/credits/${id}/collect`, {});
      setStatus({ type: 'success', msg: 'Marked as collected (not counted as new sale)' });
      load();
    } catch (err) {
      setStatus({ type: 'error', msg: err.response?.data?.message || 'Failed to collect' });
    } finally {
      setCollecting(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Owings</h2>
          <p className="text-sm text-slate-500">Customers who owe — collect without recording as new sale</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-navy text-white text-xs font-semibold px-3 py-2 rounded-lg"
        >
          {showForm ? 'Cancel' : '+ Add Owing'}
        </button>
      </div>

      {status && (
        <div
          className={`text-sm px-4 py-3 rounded-xl border mb-3 ${
            status.type === 'success'
              ? 'bg-green-50 text-green-700 border-green-200'
              : 'bg-red-50 text-red-700 border-red-200'
          }`}
        >
          {status.msg}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 mb-4">
          <input
            required
            placeholder="Customer name *"
            value={form.customerName}
            onChange={(e) => setForm({ ...form, customerName: e.target.value })}
            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm"
          />
          <input
            placeholder="Shop name"
            value={form.shopName}
            onChange={(e) => setForm({ ...form, shopName: e.target.value })}
            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              required
              type="number"
              min="1"
              placeholder="Amount *"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm"
            />
            <input
              required
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm"
            />
          </div>
          <button type="submit" className="w-full bg-navy text-white font-semibold py-3 rounded-xl">
            Save Owing
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Loading...</p>
      ) : credits.length === 0 ? (
        <p className="text-sm text-slate-400">No pending owings</p>
      ) : (
        <div className="space-y-2">
          {credits.map((c) => {
            const days = daysUntil(c.dueDate);
            const overdue = days < 0;
            return (
              <div
                key={c._id}
                className={`bg-white border rounded-xl p-3 ${
                  overdue ? 'border-red-200' : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-sm text-slate-800">{c.customerName}</div>
                    {c.shopName && <div className="text-xs text-slate-500">{c.shopName}</div>}
                    <div className="text-sm font-semibold text-amber-700 mt-0.5">
                      GHS {c.balance.toLocaleString()}
                      {c.status === 'partial' && (
                        <span className="text-xs font-normal text-slate-400">
                          {' '}
                          (of {c.amount})
                        </span>
                      )}
                    </div>
                    <div
                      className={`text-xs mt-0.5 ${
                        overdue ? 'text-red-600 font-medium' : 'text-slate-400'
                      }`}
                    >
                      {overdue
                        ? `Overdue by ${Math.abs(days)} day(s)`
                        : days === 0
                        ? 'Due today'
                        : `Due in ${days} day(s) · ${c.dueDate}`}
                    </div>
                  </div>
                  <button
                    onClick={() => handleCollect(c._id)}
                    disabled={collecting === c._id}
                    className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-medium disabled:opacity-60"
                  >
                    {collecting === c._id ? '...' : 'Collected'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
