import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function AdminTargets() {
  const month = new Date().toISOString().slice(0, 7);
  const [omrs, setOmrs] = useState([]);
  const [targets, setTargets] = useState([]);
  const [amounts, setAmounts] = useState({});
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [uRes, tRes] = await Promise.all([
        api.get('/admin/users?role=omr'),
        api.get(`/admin/targets?month=${month}`),
      ]);
      setOmrs(uRes.data);
      setTargets(tRes.data);
      const map = {};
      tRes.data.forEach((t) => {
        const id = t.userId?._id || t.userId;
        map[id] = String(t.targetAmount);
      });
      setAmounts(map);
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
    if (!amount || amount <= 0) {
      setStatus({ type: 'error', msg: 'Enter a target greater than 0' });
      return;
    }
    setSaving(userId);
    setStatus(null);
    try {
      await api.post('/admin/targets', {
        userId,
        targetAmount: amount,
        month,
        repName: fullName,
      });
      setStatus({ type: 'success', msg: `Target saved for ${fullName}` });
      load();
    } catch (err) {
      setStatus({ type: 'error', msg: err.response?.data?.message || 'Failed' });
    } finally {
      setSaving(null);
    }
  };

  const targetFor = (userId) =>
    targets.find((t) => (t.userId?._id || t.userId) === userId);

  return (
    <div>
      <h2 className="text-lg font-bold text-slate-800 mb-1">Monthly Targets</h2>
      <p className="text-sm text-slate-500 mb-4">
        Set target for each OMR · {month}
      </p>

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

      {loading ? (
        <p className="text-sm text-slate-400">Loading...</p>
      ) : omrs.length === 0 ? (
        <p className="text-sm text-slate-400">
          No OMRs yet. Add OMRs under Users first.
        </p>
      ) : (
        <div className="space-y-3">
          {omrs.map((u) => {
            const t = targetFor(u._id);
            return (
              <div key={u._id} className="bg-white border border-slate-200 rounded-xl p-3">
                <div className="font-medium text-sm text-slate-800">{u.fullName}</div>
                <div className="text-xs text-slate-500 mb-2">
                  {u.territory || '—'} · {u.distributor || '—'}
                  {t && (
                    <span className="ml-2 text-emerald-600">
                      Achieved {t.percentage || 0}%
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    placeholder="Target GHS"
                    value={amounts[u._id] || ''}
                    onChange={(e) =>
                      setAmounts({ ...amounts, [u._id]: e.target.value })
                    }
                    className="flex-1 border rounded-lg px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    disabled={saving === u._id}
                    onClick={() => saveTarget(u._id, u.fullName)}
                    className="bg-navy text-white text-sm px-4 py-2 rounded-lg disabled:opacity-60"
                  >
                    {saving === u._id ? '...' : 'Save'}
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
