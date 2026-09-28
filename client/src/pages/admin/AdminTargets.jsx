import { useEffect, useState } from 'react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export default function AdminTargets() {
  const { dark } = useTheme();
  const [month, setMonth] = useState(currentMonth());
  const [omrs, setOmrs] = useState([]);
  const [targets, setTargets] = useState([]);
  const [amounts, setAmounts] = useState({});
  const [planned, setPlanned] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [status, setStatus] = useState(null);

  const load = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const [uRes, tRes] = await Promise.all([
        api.get('/admin/users?role=omr'),
        api.get(`/admin/targets?month=${month}`),
      ]);
      const users = (uRes.data || []).filter((u) => !u.isTraining && u.isActive !== false);
      setOmrs(users);
      setTargets(tRes.data || []);
      const am = {};
      const pl = {};
      (tRes.data || []).forEach((t) => {
        const id = String(t.userId?._id || t.userId);
        am[id] = String(t.targetAmount ?? '');
        pl[id] = String(t.plannedOutlets ?? '');
      });
      setAmounts(am);
      setPlanned(pl);
    } catch (e) {
      setStatus({ type: 'error', msg: e.response?.data?.message || 'Failed to load' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [month]);

  const saveTarget = async (userId, fullName) => {
    const amount = Number(amounts[userId]);
    if (!amount || amount < 0) {
      setStatus({ type: 'error', msg: 'Enter a sales target greater than 0' });
      return;
    }
    setSaving(userId);
    try {
      await api.post('/admin/targets', {
        userId,
        targetAmount: amount,
        plannedOutlets: Number(planned[userId]) || 0,
        month,
        repName: fullName,
      });
      setStatus({ type: 'ok', msg: `Target saved for ${fullName}` });
      await load();
    } catch (e) {
      setStatus({ type: 'error', msg: e.response?.data?.message || 'Save failed' });
    } finally {
      setSaving(null);
    }
  };

  const targetFor = (userId) =>
    targets.find((t) => String(t.userId?._id || t.userId) === String(userId));

  const withTarget = omrs
    .map((u) => ({ u, t: targetFor(u._id) }))
    .sort((a, b) => (b.t?.percentage || 0) - (a.t?.percentage || 0));

  const inputCls = dark
    ? 'w-full rounded-xl border border-slate-600 bg-slate-800 text-white px-3 py-2 text-sm'
    : 'w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900';

  const teamTarget = withTarget.reduce((s, x) => s + (Number(x.t?.targetAmount) || 0), 0);
  const teamAchieved = withTarget.reduce((s, x) => s + (Number(x.t?.achievedAmount) || 0), 0);
  const teamPct =
    teamTarget > 0 ? Math.min(100, Math.round((teamAchieved / teamTarget) * 1000) / 10) : 0;

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className={`text-xl font-extrabold ${dark ? 'text-white' : 'text-slate-900'}`}>
            OMR target achievement
          </h1>
          <p className={`text-sm ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
            Live sales vs monthly target · {month}
          </p>
        </div>
        <div>
          <label className={`text-[10px] font-bold ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
            Month
          </label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className={inputCls}
          />
        </div>
      </div>

      {/* Team summary */}
      <div
        className={`rounded-2xl border-2 p-4 ${
          dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-[#2596be]/30 shadow-sm'
        }`}
      >
        <div className="flex flex-wrap justify-between gap-2 text-sm">
          <div>
            <div className={`text-[10px] font-bold uppercase ${dark ? 'text-slate-500' : 'text-slate-500'}`}>
              Team achieved
            </div>
            <div className={`text-lg font-extrabold ${dark ? 'text-white' : 'text-slate-900'}`}>
              GHS {teamAchieved.toLocaleString()}
            </div>
          </div>
          <div>
            <div className={`text-[10px] font-bold uppercase ${dark ? 'text-slate-500' : 'text-slate-500'}`}>
              Team target
            </div>
            <div className={`text-lg font-extrabold ${dark ? 'text-white' : 'text-slate-900'}`}>
              GHS {teamTarget.toLocaleString()}
            </div>
          </div>
          <div>
            <div className={`text-[10px] font-bold uppercase ${dark ? 'text-slate-500' : 'text-slate-500'}`}>
              Team %
            </div>
            <div className="text-lg font-extrabold text-[#117ea6]">{teamPct}%</div>
          </div>
        </div>
        <div className={`mt-3 h-2.5 rounded-full overflow-hidden ${dark ? 'bg-slate-800' : 'bg-slate-100'}`}>
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#117ea6] to-[#2596be] transition-all"
            style={{ width: `${Math.min(100, teamPct)}%` }}
          />
        </div>
      </div>

      {status && (
        <p
          className={`text-sm font-medium ${
            status.type === 'ok' ? 'text-emerald-500' : 'text-amber-600'
          }`}
        >
          {status.msg}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <div className="space-y-3">
          {withTarget.map(({ u, t }) => {
            const pct = t?.percentage || 0;
            const achieved = t?.achievedAmount || 0;
            const targetAmt = t?.targetAmount || 0;
            const barColor =
              pct >= 100 ? 'bg-emerald-500' : pct >= 70 ? 'bg-[#2596be]' : pct >= 40 ? 'bg-amber-500' : 'bg-rose-500';

            return (
              <div
                key={u._id}
                className={`rounded-2xl border-2 p-4 ${
                  dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                  <div>
                    <div className={`font-bold text-sm ${dark ? 'text-white' : 'text-slate-900'}`}>
                      {u.fullName}
                    </div>
                    <div className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
                      {u.distributor || 'No distributor'} · {u.territory || '—'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-extrabold ${dark ? 'text-white' : 'text-slate-900'}`}>
                      {t ? `${pct}%` : '—'}
                    </div>
                    <div className={`text-[11px] ${dark ? 'text-slate-500' : 'text-slate-500'}`}>
                      {t
                        ? `GHS ${Number(achieved).toLocaleString()} / ${Number(targetAmt).toLocaleString()}`
                        : 'No target set'}
                    </div>
                  </div>
                </div>

                {t && (
                  <div className={`h-2 rounded-full overflow-hidden mb-3 ${dark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                    <div
                      className={`h-full rounded-full ${barColor} transition-all`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500">Sales target (GHS)</label>
                    <input
                      type="number"
                      className={inputCls}
                      value={amounts[u._id] ?? ''}
                      onChange={(e) => setAmounts({ ...amounts, [u._id]: e.target.value })}
                      placeholder="e.g. 50000"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500">Planned outlets</label>
                    <input
                      type="number"
                      className={inputCls}
                      value={planned[u._id] ?? ''}
                      onChange={(e) => setPlanned({ ...planned, [u._id]: e.target.value })}
                      placeholder="e.g. 40"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={saving === u._id}
                    onClick={() => saveTarget(u._id, u.fullName)}
                    className="py-2.5 rounded-xl bg-[#117ea6] text-white text-sm font-bold disabled:opacity-60"
                  >
                    {saving === u._id ? 'Saving…' : 'Save target'}
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
