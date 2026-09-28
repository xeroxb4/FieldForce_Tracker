import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    Promise.all([
      api.get('/admin/users?role=omr'),
      api.get(`/admin/targets?month=${month}`),
    ])
      .then(([uRes, tRes]) => {
        const users = (uRes.data || []).filter((u) => !u.isTraining && u.isActive !== false);
        setOmrs(users);
        setTargets(tRes.data || []);
      })
      .catch((e) => setError(e.response?.data?.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, [month]);

  const targetFor = (userId) =>
    targets.find((t) => String(t.userId?._id || t.userId) === String(userId));

  const rows = omrs
    .map((u) => ({ u, t: targetFor(u._id) }))
    .sort((a, b) => (b.t?.percentage || 0) - (a.t?.percentage || 0));

  const teamTarget = rows.reduce((s, x) => s + (Number(x.t?.targetAmount) || 0), 0);
  const teamAchieved = rows.reduce((s, x) => s + (Number(x.t?.achievedAmount) || 0), 0);
  const teamPct =
    teamTarget > 0 ? Math.min(100, Math.round((teamAchieved / teamTarget) * 1000) / 10) : 0;

  const inputCls = dark
    ? 'rounded-xl border border-slate-600 bg-slate-800 text-white px-3 py-2 text-sm'
    : 'rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900';

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className={`text-xl font-extrabold ${dark ? 'text-white' : 'text-slate-900'}`}>
            Target achievement
          </h1>
          <p className={`text-sm ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
            Live sales vs monthly target (view only). To set targets, use{' '}
            <Link to="/admin/settings" className="font-bold text-[#117ea6] underline">
              Settings
            </Link>
            .
          </p>
        </div>
        <div>
          <label className={`text-[10px] font-bold block ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
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

      <div
        className={`rounded-2xl border-2 p-4 ${
          dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-[#2596be]/30 shadow-sm'
        }`}
      >
        <div className="flex flex-wrap justify-between gap-3 text-sm">
          <div>
            <div className="text-[10px] font-bold uppercase text-slate-500">Team achieved</div>
            <div className={`text-lg font-extrabold ${dark ? 'text-white' : 'text-slate-900'}`}>
              GHS {teamAchieved.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase text-slate-500">Team target</div>
            <div className={`text-lg font-extrabold ${dark ? 'text-white' : 'text-slate-900'}`}>
              GHS {teamTarget.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase text-slate-500">Team %</div>
            <div className="text-lg font-extrabold text-[#117ea6]">{teamPct}%</div>
          </div>
        </div>
        <div className={`mt-3 h-2.5 rounded-full overflow-hidden ${dark ? 'bg-slate-800' : 'bg-slate-100'}`}>
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#117ea6] to-[#2596be]"
            style={{ width: `${Math.min(100, teamPct)}%` }}
          />
        </div>
      </div>

      {error && <p className="text-sm text-amber-600 font-medium">{error}</p>}
      {loading && <p className="text-sm text-slate-500">Loading…</p>}

      {!loading && (
        <div className="space-y-3">
          {rows.map(({ u, t }) => {
            const pct = t?.percentage || 0;
            const achieved = t?.achievedAmount || 0;
            const targetAmt = t?.targetAmount || 0;
            const barColor =
              pct >= 100
                ? 'bg-emerald-500'
                : pct >= 70
                ? 'bg-[#2596be]'
                : pct >= 40
                ? 'bg-amber-500'
                : 'bg-rose-500';

            return (
              <div
                key={u._id}
                className={`rounded-2xl border-2 p-4 ${
                  dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className={`font-bold text-sm ${dark ? 'text-white' : 'text-slate-900'}`}>
                      {u.fullName}
                    </div>
                    <div className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
                      {u.distributor || 'No distributor'} · {u.territory || '—'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xl font-extrabold ${dark ? 'text-white' : 'text-slate-900'}`}>
                      {t ? `${pct}%` : '—'}
                    </div>
                    <div className={`text-[11px] ${dark ? 'text-slate-500' : 'text-slate-500'}`}>
                      {t
                        ? `GHS ${Number(achieved).toLocaleString()} / ${Number(targetAmt).toLocaleString()}`
                        : 'No target set this month'}
                    </div>
                  </div>
                </div>
                {t && (
                  <div className={`mt-3 h-2 rounded-full overflow-hidden ${dark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                    <div
                      className={`h-full rounded-full ${barColor}`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
