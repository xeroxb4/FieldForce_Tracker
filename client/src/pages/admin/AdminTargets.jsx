import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

export default function AdminTargets() {
  const { dark } = useTheme();
  const month = new Date().toISOString().slice(0, 7);
  const [omrs, setOmrs] = useState([]);
  const [targets, setTargets] = useState([]);
  const [amounts, setAmounts] = useState({});
  const [planned, setPlanned] = useState({});
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);

  const inputCls = `w-full rounded-xl px-3 py-2 text-sm border-2 font-medium ${
    dark ? 'bg-slate-900 border-slate-600 text-white' : 'bg-white border-[#2596be]/40 text-slate-900'
  }`;

  const load = async () => {
    setLoading(true);
    try {
      const [uRes, tRes] = await Promise.all([
        api.get('/admin/users?role=omr'),
        api.get(`/admin/targets?month=${month}`),
      ]);
      setOmrs(uRes.data);
      setTargets(tRes.data);
      const am = {};
      const pl = {};
      tRes.data.forEach((t) => {
        const id = t.userId?._id || t.userId;
        am[id] = String(t.targetAmount ?? '');
        pl[id] = String(t.plannedOutlets ?? '');
      });
      setAmounts(am);
      setPlanned(pl);
    } catch {
      setStatus({ type: 'error', msg: 'Failed to load' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const saveTarget = async (userId, fullName) => {
    const amount = Number(amounts[userId]);
    const plannedOutlets = Number(planned[userId]) || 0;
    if (!amount || amount <= 0) {
      setStatus({ type: 'error', msg: 'Enter a sales target greater than 0' });
      return;
    }
    setSaving(userId);
    setStatus(null);
    try {
      await api.post('/admin/targets', {
        userId,
        targetAmount: amount,
        plannedOutlets,
        month,
        repName: fullName,
      });
      setStatus({ type: 'success', msg: `Saved for ${fullName}` });
      load();
    } catch (err) {
      setStatus({ type: 'error', msg: err.response?.data?.message || 'Failed' });
    } finally {
      setSaving(null);
    }
  };

  const targetFor = (userId) =>
    targets.find((t) => String(t.userId?._id || t.userId) === String(userId));

  return (
    <div>
      <h2 className={`text-lg font-extrabold mb-1 ${dark ? 'text-white' : 'text-slate-900'}`}>
        Monthly Targets
      </h2>
      <p className={`text-sm mb-4 font-medium ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
        Sales target + planned outlets per OMR · {month}
      </p>

      {status && (
        <div
          className={`text-sm px-4 py-3 rounded-xl border mb-3 font-medium ${
            status.type === 'success'
              ? 'bg-green-50 text-green-700 border-green-200'
              : 'bg-red-50 text-red-700 border-red-200'
          }`}
        >
          {status.msg}
        </div>
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
                  {t && ` · Achieved ${t.percentage || 0}%`}
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
