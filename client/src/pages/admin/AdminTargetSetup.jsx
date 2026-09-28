import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export default function AdminTargetSetup() {
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

  const inputCls = dark
    ? 'w-full rounded-xl border border-slate-600 bg-slate-800 text-white px-3 py-2 text-sm'
    : 'w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900';

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className={`text-xl font-extrabold ${dark ? 'text-white' : 'text-slate-900'}`}>
            OMR monthly targets + planned outlets
          </h1>
          <p className={`text-sm ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
            Set sales target (GHS) and planned outlets. View live achievement under{' '}
            <Link to="/admin/targets" className="font-bold text-[#117ea6] underline">
              Targets
            </Link>
            .
          </p>
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500">Month</label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className={inputCls}
          />
        </div>
      </div>

      {status && (
        <p className={`text-sm font-medium ${status.type === 'ok' ? 'text-emerald-500' : 'text-amber-600'}`}>
          {status.msg}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <div className="space-y-3">
          {omrs.map((u) => {
            const t = targetFor(u._id);
            return (
              <div
                key={u._id}
                className={`rounded-2xl border-2 p-3 ${
                  dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-[#2596be]/40 shadow-sm'
                }`}
              >
                <div className={`font-bold text-sm ${dark ? 'text-white' : 'text-slate-900'}`}>
                  {u.fullName}
                </div>
                <div className={`text-xs mb-2 ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {u.distributor || 'No distributor'} · {u.territory || '—'}
                  {t && ` · Currently ${t.percentage || 0}% achieved`}
                </div>
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
                    className="py-2.5 rounded-xl bg-[#2596be] text-white text-sm font-bold disabled:opacity-60"
                  >
                    {saving === u._id ? 'Saving…' : 'Save'}
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
