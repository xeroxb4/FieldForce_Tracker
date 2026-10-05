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

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAutoFill = async () => {
    setAutoLoading(true);
    setStatus(null);
    try {
      const { data } = await api.get(`/omr/visits/today?date=${form.date}`);
      const orders = data.filter((v) => v.outcome === 'Order Placed');
      const totalAmt = data.reduce((sum, v) => sum + (v.amount || 0), 0);
      const names = data.map((v) => v.shopName).join('\n');

      setForm((prev) => ({
        ...prev,
        shopsVisited: String(data.length),
        shopNames: names,
        ordersCount: String(orders.length),
        totalAmount: totalAmt ? String(totalAmt) : '',
      }));

      setStatus({
        type: 'success',
        msg: data.length
          ? `Pulled ${data.length} shop visit(s) for this date.`
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
      setStatus({ type: 'success', msg: 'Day wrap-up sealed successfully.' });
    } catch (err) {
      setStatus({
        type: 'error',
        msg: err.response?.data?.message || 'Failed to submit wrap-up',
      });
    } finally {
      setLoading(false);
    }
  };

  const coveragePreview =
    form.shopsPlanned && form.shopsVisited
      ? Math.min(
          100,
          Math.round(
            (Number(form.shopsVisited) / Math.max(Number(form.shopsPlanned), 1)) * 100
          )
        )
      : null;

  const conversionPreview =
    form.shopsVisited && form.ordersCount
      ? Math.min(
          100,
          Math.round(
            (Number(form.ordersCount) / Math.max(Number(form.shopsVisited), 1)) * 100
          )
        )
      : null;

  const shell = dark
    ? 'bg-gradient-to-b from-[#030712] via-[#0a0f1e] to-[#030712]'
    : 'bg-gradient-to-b from-slate-50 via-white to-violet-50/40';

  const card = dark
    ? 'relative overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-gradient-to-br from-white/[0.07] via-white/[0.03] to-transparent backdrop-blur-3xl shadow-[0_32px_80px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)]'
    : 'relative overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white/90 backdrop-blur-3xl shadow-[0_28px_70px_rgba(63,37,139,0.1),inset_0_1px_0_rgba(255,255,255,0.9)]';

  const label = `block text-[10px] font-black uppercase tracking-[0.22em] mb-2.5 ${
    dark ? 'text-violet-300/80' : 'text-violet-700'
  }`;

  const input = `w-full rounded-2xl px-4 py-3.5 text-sm font-semibold outline-none transition-all duration-200 focus:ring-2 focus:ring-violet-500/40 ${
    dark
      ? 'bg-black/40 border border-white/10 text-white placeholder:text-slate-500 focus:border-violet-400/50'
      : 'bg-slate-50/80 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-violet-400/60'
  }`;

  return (
    <div className={`-mx-4 -mt-2 px-4 pb-14 min-h-[80vh] ${shell}`}>
      {/* ─── Cinematic hero ─── */}
      <div
        className="relative overflow-hidden rounded-[2rem] p-7 mb-7 text-white"
        style={{
          background: dark
            ? 'linear-gradient(145deg, #0f0a1e 0%, #1a0f3a 35%, #3F258B 70%, #5b3aad 100%)'
            : 'linear-gradient(145deg, #1e1145 0%, #3F258B 45%, #6d28d9 100%)',
          boxShadow: dark
            ? '0 40px 80px rgba(63,37,139,0.45), 0 0 0 1px rgba(255,255,255,0.06)'
            : '0 36px 70px rgba(63,37,139,0.35)',
        }}
      >
        {/* Ambient orbs */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-fuchsia-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-cyan-300/15 blur-3xl" />
        <div className="pointer-events-none absolute right-1/3 top-1/2 h-24 w-24 -translate-y-1/2 rounded-full bg-white/10 blur-2xl" />

        {/* Fine grain overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
          }}
        />

        <div className="relative">
          <div className="mb-4 flex items-center gap-2">
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-violet-200/90">
              Executive close · End of day
            </p>
          </div>
          <h2 className="mb-1 text-[1.85rem] font-black tracking-tight leading-none">
            Day Wrap-Up
          </h2>
          <p className="text-sm font-medium text-white/90">{user?.fullName}</p>
          <p className="mt-4 max-w-sm text-xs leading-relaxed text-white/60">
            Seal coverage, orders, and field intelligence — a close worthy of executive review.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Date + Auto-fill */}
        <div className={`${card} p-6`}>
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-40 blur-3xl"
            style={{ background: dark ? 'rgba(139,92,246,0.25)' : 'rgba(139,92,246,0.12)' }}
          />
          <label className={label}>Date</label>
          <input
            type="date"
            name="date"
            value={form.date}
            onChange={handleChange}
            className={input}
          />
          <button
            type="button"
            onClick={handleAutoFill}
            disabled={autoLoading}
            className="mt-5 w-full rounded-2xl py-4 text-sm font-black tracking-wide text-white transition-all duration-200 active:scale-[0.98] disabled:opacity-60"
            style={{
              background: 'linear-gradient(135deg, #7c3aed 0%, #3F258B 55%, #2e1a6b 100%)',
              boxShadow: '0 18px 44px rgba(63,37,139,0.45)',
            }}
          >
            {autoLoading ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Pulling visits…
              </span>
            ) : (
              'Auto-fill from today’s visits'
            )}
          </button>
        </div>

        {/* Coverage */}
        <div className={`${card} p-6`}>
          <p className={`${label} mb-4`}>Coverage</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Shops planned</label>
              <input
                type="number"
                name="shopsPlanned"
                value={form.shopsPlanned}
                onChange={handleChange}
                className={input}
                min="0"
                placeholder="0"
              />
            </div>
            <div>
              <label className={label}>Shops visited</label>
              <input
                type="number"
                name="shopsVisited"
                value={form.shopsVisited}
                onChange={handleChange}
                className={input}
                min="0"
                placeholder="0"
              />
            </div>
          </div>

          {(coveragePreview != null || conversionPreview != null) && (
            <div className="mt-6 space-y-4">
              {coveragePreview != null && (
                <div>
                  <div className="mb-2 flex justify-between text-[11px] font-bold">
                    <span className={dark ? 'text-slate-400' : 'text-slate-500'}>
                      Coverage
                    </span>
                    <span className="text-violet-400">{coveragePreview}%</span>
                  </div>
                  <div
                    className={`h-2.5 overflow-hidden rounded-full ${
                      dark ? 'bg-white/5' : 'bg-slate-100'
                    }`}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${coveragePreview}%`,
                        background:
                          'linear-gradient(90deg, #a78bfa, #7c3aed, #3F258B)',
                        boxShadow: '0 0 12px rgba(124,58,237,0.5)',
                      }}
                    />
                  </div>
                </div>
              )}
              {conversionPreview != null && (
                <div>
                  <div className="mb-2 flex justify-between text-[11px] font-bold">
                    <span className={dark ? 'text-slate-400' : 'text-slate-500'}>
                      Visit conversion
                    </span>
                    <span className="text-emerald-400">{conversionPreview}%</span>
                  </div>
                  <div
                    className={`h-2.5 overflow-hidden rounded-full ${
                      dark ? 'bg-white/5' : 'bg-slate-100'
                    }`}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${conversionPreview}%`,
                        background:
                          'linear-gradient(90deg, #34d399, #10b981, #059669)',
                        boxShadow: '0 0 12px rgba(16,185,129,0.45)',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Shop names */}
        <div className={`${card} p-6`}>
          <label className={label}>Shop names (one per line)</label>
          <textarea
            name="shopNames"
            value={form.shopNames}
            onChange={handleChange}
            rows={4}
            className={`${input} resize-none`}
            placeholder="Outlet names visited…"
          />
        </div>

        {/* Orders */}
        <div className={`${card} p-6`}>
          <p className={`${label} mb-4`}>Orders</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Orders count</label>
              <input
                type="number"
                name="ordersCount"
                value={form.ordersCount}
                onChange={handleChange}
                className={input}
                min="0"
                placeholder="0"
              />
            </div>
            <div>
              <label className={label}>Total amount (GHS)</label>
              <input
                type="number"
                name="totalAmount"
                value={form.totalAmount}
                onChange={handleChange}
                className={input}
                min="0"
                step="0.01"
                placeholder="0.00"
              />
            </div>
          </div>
          {form.totalAmount && Number(form.totalAmount) > 0 && (
            <div
              className={`mt-5 flex items-center justify-between rounded-2xl px-4 py-3 ${
                dark
                  ? 'bg-emerald-500/10 border border-emerald-400/20'
                  : 'bg-emerald-50 border border-emerald-200'
              }`}
            >
              <span
                className={`text-[10px] font-black uppercase tracking-[0.18em] ${
                  dark ? 'text-emerald-300/80' : 'text-emerald-700'
                }`}
              >
                Day value
              </span>
              <span
                className={`text-lg font-black tabular-nums ${
                  dark ? 'text-emerald-300' : 'text-emerald-700'
                }`}
              >
                GHS{' '}
                {Number(form.totalAmount).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className={`${card} p-6`}>
          <label className={label}>Field notes</label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            rows={4}
            className={`${input} resize-none`}
            placeholder="Challenges, competitor activity, next actions…"
          />
        </div>

        {/* Status */}
        {status && (
          <div
            className={`rounded-2xl border px-4 py-3.5 text-sm font-semibold ${
              status.type === 'success'
                ? dark
                  ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-300'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : dark
                  ? 'border-red-400/30 bg-red-500/15 text-red-300'
                  : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {status.msg}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="relative w-full overflow-hidden rounded-2xl py-4.5 text-sm font-black tracking-wide text-white transition-all duration-200 active:scale-[0.98] disabled:opacity-60"
          style={{
            background:
              'linear-gradient(135deg, #a78bfa 0%, #7c3aed 40%, #3F258B 100%)',
            boxShadow:
              '0 24px 56px rgba(63,37,139,0.5), inset 0 1px 0 rgba(255,255,255,0.15)',
            paddingTop: '1.1rem',
            paddingBottom: '1.1rem',
          }}
        >
          <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Sealing…
            </span>
          ) : (
            'Submit day wrap-up'
          )}
        </button>
      </form>
    </div>
  );
}
