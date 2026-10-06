import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { usePremium, PremiumHero } from '../../lib/premium';

function daysUntil(dueDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + 'T00:00:00');
  return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
}

export default function Owings() {
  const { dark } = useTheme();
  const p = usePremium(dark);
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

  const pending = credits.filter((c) => !c.collected);
  const totalPending = pending.reduce((s, c) => s + (Number(c.amount) || 0), 0);

  return (
    <div className={`-mx-4 -mt-2 px-4 pb-12 min-h-[70vh] ${p.shell}`}>
      <PremiumHero
        dark={dark}
        eyebrow="Collections"
        title="Owings"
        subtitle="Track credit & collect without logging as a new sale"
        right={
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="shrink-0 rounded-2xl px-4 py-2.5 text-xs font-black text-white"
            style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)' }}
          >
            {showForm ? 'Cancel' : '+ Add'}
          </button>
        }
      >
        {pending.length > 0 && (
          <div className="mt-4 flex gap-3">
            <div className="rounded-xl px-3 py-2 bg-white/10 backdrop-blur">
              <p className="text-[9px] font-black uppercase tracking-wider text-violet-200/80">Pending</p>
              <p className="text-lg font-black">{pending.length}</p>
            </div>
            <div className="rounded-xl px-3 py-2 bg-white/10 backdrop-blur">
              <p className="text-[9px] font-black uppercase tracking-wider text-violet-200/80">Value</p>
              <p className="text-lg font-black">GHS {totalPending.toLocaleString()}</p>
            </div>
          </div>
        )}
      </PremiumHero>

      {status && (
        <div
          className={`text-sm px-4 py-3.5 rounded-2xl border font-semibold mb-4 ${
            status.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-700 border-red-200'
          }`}
        >
          {status.msg}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className={`p-5 space-y-4 mb-5 ${p.glass}`} style={p.glassStyle}>
          <div>
            <label className={p.label}>Customer name *</label>
            <input
              required
              placeholder="Full name"
              value={form.customerName}
              onChange={(e) => setForm({ ...form, customerName: e.target.value })}
              className={p.input}
            />
          </div>
          <div>
            <label className={p.label}>Shop name</label>
            <input
              placeholder="Outlet / shop"
              value={form.shopName}
              onChange={(e) => setForm({ ...form, shopName: e.target.value })}
              className={p.input}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={p.label}>Amount (GHS) *</label>
              <input
                required
                type="number"
                min="1"
                step="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className={p.input}
              />
            </div>
            <div>
              <label className={p.label}>Due date *</label>
              <input
                required
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className={p.input}
                style={{ colorScheme: dark ? 'dark' : 'light' }}
              />
            </div>
          </div>
          <div>
            <label className={p.label}>Notes</label>
            <input
              placeholder="Optional notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className={p.input}
            />
          </div>
          <button type="submit" className={`w-full ${p.btnPrimary}`} style={p.btnPrimaryStyle}>
            Save owing
          </button>
        </form>
      )}

      {loading ? (
        <div className={`p-8 text-center ${p.glass}`} style={p.glassStyle}>
          <div className="w-8 h-8 mx-auto rounded-full border-2 border-[#3F258B] border-t-transparent animate-spin" />
          <p className={`text-sm mt-3 font-medium ${p.muted}`}>Loading owings…</p>
        </div>
      ) : credits.length === 0 ? (
        <div className={`p-8 text-center ${p.glass}`} style={p.glassStyle}>
          <p className="text-3xl mb-2">✓</p>
          <p className={`text-sm font-semibold ${p.title}`}>No pending owings</p>
          <p className={`text-xs mt-1 ${p.soft}`}>All clear — add one when a customer owes</p>
        </div>
      ) : (
        <div className="space-y-3">
          {credits.map((c) => {
            const days = daysUntil(c.dueDate);
            const overdue = days < 0 && !c.collected;
            const collected = !!c.collected;
            return (
              <div
                key={c._id}
                className={`p-4 mb-1 border ${
                  collected
                    ? dark
                      ? 'bg-slate-900/40 border-white/5 opacity-70 rounded-[1.25rem]'
                      : 'bg-slate-50 border-slate-100 opacity-80 rounded-[1.25rem]'
                    : overdue
                    ? dark
                      ? 'bg-red-950/40 border-red-500/30 ' + p.card3d
                      : 'bg-red-50/80 border-red-200 ' + p.card3d
                    : p.card3d
                }`}
                style={!collected ? p.card3dStyle : undefined}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={`font-bold text-sm ${p.title}`}>{c.customerName}</p>
                    {c.shopName && <p className={`text-xs mt-0.5 ${p.muted}`}>{c.shopName}</p>}
                    <p className={`text-lg font-black mt-2 ${overdue ? 'text-red-400' : 'text-violet-400'}`}>
                      GHS {Number(c.amount).toLocaleString()}
                    </p>
                    <p className={`text-[11px] mt-1 font-medium ${overdue ? 'text-red-400' : p.soft}`}>
                      {collected
                        ? 'Collected'
                        : overdue
                        ? `${Math.abs(days)} day(s) overdue`
                        : days === 0
                        ? 'Due today'
                        : `Due in ${days} day(s)`}
                      {c.dueDate ? ` · ${c.dueDate}` : ''}
                    </p>
                    {c.notes && <p className={`text-[11px] mt-1 ${p.soft}`}>{c.notes}</p>}
                  </div>
                  {!collected && (
                    <button
                      type="button"
                      disabled={collecting === c._id}
                      onClick={() => handleCollect(c._id)}
                      className="shrink-0 rounded-xl px-3.5 py-2 text-[11px] font-black text-white disabled:opacity-50"
                      style={{
                        background: 'linear-gradient(135deg, #34d399, #059669)',
                        boxShadow: '0 3px 10px rgba(5,150,105,0.18)',
                      }}
                    >
                      {collecting === c._id ? '…' : 'Collect'}
                    </button>
                  )}
                  {collected && (
                    <span className="shrink-0 text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400">
                      Done
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
