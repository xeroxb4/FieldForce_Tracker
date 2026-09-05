import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

const DAY_OPTIONS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

const DAY_LABEL = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' };

export default function AdminOutlets() {
  const { dark } = useTheme();
  const [outlets, setOutlets] = useState([]);
  const [omrs, setOmrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [filterUser, setFilterUser] = useState('');
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const inputCls = `w-full rounded-xl px-3 py-2.5 text-sm border ${
    dark
      ? 'bg-slate-900 border-slate-600 text-white'
      : 'bg-white border-slate-300 text-slate-900'
  }`;

  const load = async () => {
    setLoading(true);
    try {
      const q = filterUser ? `?assignedTo=${filterUser}` : '';
      const [oRes, uRes, mRes] = await Promise.all([
        api.get(`/admin/outlets${q}`),
        api.get('/admin/users?role=omr'),
        api.get('/admin/users?role=merchandiser'),
      ]);
      setOutlets(oRes.data);
      setOmrs([...uRes.data, ...mRes.data]);
    } catch {
      setStatus({ type: 'error', msg: 'Failed to load' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filterUser]);

  const openEdit = (o) => {
    setEditing({
      _id: o._id,
      name: o.name || '',
      contactName: o.contactName || '',
      contactPhone: o.contactPhone || '',
      address: o.address || '',
      notes: o.notes || '',
      assignedTo: o.assignedTo?._id || o.assignedTo || '',
      assignedDays: o.assignedDays || [],
      avcEnrolled: !!o.avcEnrolled,
      avcTier: o.avcTier || 'Gold',
      isActive: o.isActive !== false,
    });
  };

  const toggleDay = (day) => {
    setEditing((e) => ({
      ...e,
      assignedDays: e.assignedDays.includes(day)
        ? e.assignedDays.filter((d) => d !== day)
        : [...e.assignedDays, day].sort(),
    }));
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    setStatus(null);
    try {
      await api.put(`/admin/outlets/${editing._id}`, {
        name: editing.name,
        contactName: editing.contactName,
        contactPhone: editing.contactPhone,
        address: editing.address,
        notes: editing.notes,
        assignedTo: editing.assignedTo || undefined,
        assignedDays: editing.assignedDays,
        avcEnrolled: editing.avcEnrolled,
        avcTier: editing.avcEnrolled ? editing.avcTier : '',
        isActive: editing.isActive,
      });
      setStatus({ type: 'success', msg: 'Outlet updated' });
      setEditing(null);
      load();
    } catch (err) {
      setStatus({ type: 'error', msg: err.response?.data?.message || 'Update failed' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!confirm('Remove this outlet from the active list?')) return;
    try {
      await api.delete(`/admin/outlets/${id}`);
      setStatus({ type: 'success', msg: 'Outlet removed' });
      load();
    } catch {
      setStatus({ type: 'error', msg: 'Failed to remove' });
    }
  };

  return (
    <div>
      <h2 className={`text-lg font-bold mb-1 ${dark ? 'text-white' : 'text-slate-800'}`}>
        Outlets & Beats
      </h2>
      <p className={`text-sm mb-4 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
        Edit outlets, beat days, AVC status. Filter by OMR/Merchandiser.
      </p>

      {status && (
        <div
          className={`mb-3 text-sm px-3 py-2 rounded-xl ${
            status.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
          }`}
        >
          {status.msg}
        </div>
      )}

      <div className="mb-4">
        <label className={`text-xs font-medium ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
          Filter by rep
        </label>
        <select
          value={filterUser}
          onChange={(e) => setFilterUser(e.target.value)}
          className={inputCls}
        >
          <option value="">All outlets</option>
          {omrs.map((u) => (
            <option key={u._id} value={u._id}>
              {u.fullName} ({u.role})
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : outlets.length === 0 ? (
        <p className="text-sm text-slate-500">No outlets found. Seed OMR/Merch data or create outlets.</p>
      ) : (
        <div className="space-y-2">
          {outlets.map((o) => (
            <div
              key={o._id}
              className={`rounded-2xl border p-3 ${
                dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex justify-between gap-2">
                <div>
                  <div className={`font-semibold text-sm ${dark ? 'text-white' : 'text-slate-900'}`}>
                    {o.displayName || o.name}
                  </div>
                  <div className={`text-xs mt-0.5 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {o.assignedTo?.fullName || 'Unassigned'} · {o.status}
                    {o.assignedDays?.length > 0 &&
                      ` · ${o.assignedDays.map((d) => DAY_LABEL[d]).join(', ')}`}
                  </div>
                  {o.avcEnrolled && (
                    <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500">
                      AVC {o.avcTier} (GHC {o.avcTarget?.toLocaleString()})
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEdit(o)}
                    className="text-xs px-2 py-1 rounded-lg bg-indigo-600 text-white"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(o._id)}
                    className="text-xs px-2 py-1 rounded-lg bg-red-500/15 text-red-500"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div
            className={`w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl p-4 space-y-3 ${
              dark ? 'bg-slate-900' : 'bg-white'
            }`}
          >
            <h3 className={`font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>Edit outlet</h3>

            <div>
              <label className="text-xs text-slate-500">Name</label>
              <input
                className={inputCls}
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-500">Contact</label>
                <input
                  className={inputCls}
                  value={editing.contactName}
                  onChange={(e) => setEditing({ ...editing, contactName: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">Phone</label>
                <input
                  className={inputCls}
                  value={editing.contactPhone}
                  onChange={(e) => setEditing({ ...editing, contactPhone: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500">Address</label>
              <input
                className={inputCls}
                value={editing.address}
                onChange={(e) => setEditing({ ...editing, address: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">Assign to</label>
              <select
                className={inputCls}
                value={editing.assignedTo}
                onChange={(e) => setEditing({ ...editing, assignedTo: e.target.value })}
              >
                <option value="">—</option>
                {omrs.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.fullName} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-500 mb-1 block">Beat days</label>
              <div className="flex flex-wrap gap-1">
                {DAY_OPTIONS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => toggleDay(d.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                      editing.assignedDays.includes(d.value)
                        ? 'bg-indigo-600 text-white'
                        : dark
                        ? 'bg-slate-800 text-slate-400'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={`rounded-xl border p-3 ${dark ? 'border-slate-700' : 'border-slate-200'}`}>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editing.avcEnrolled}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      avcEnrolled: e.target.checked,
                      avcTier: e.target.checked ? editing.avcTier || 'Gold' : '',
                    })
                  }
                />
                <span className={dark ? 'text-white' : 'text-slate-800'}>AVC program</span>
              </label>
              {editing.avcEnrolled ? (
                <select
                  className={`${inputCls} mt-2`}
                  value={editing.avcTier}
                  onChange={(e) => setEditing({ ...editing, avcTier: e.target.value })}
                >
                  <option value="Gold">Gold (GHC 12,500)</option>
                  <option value="Silver">Silver (GHC 10,000)</option>
                  <option value="Bronze">Bronze (GHC 5,000)</option>
                </select>
              ) : (
                <p className="text-xs text-slate-500 mt-1">
                  Off = regular customer (no AVC on name)
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className={`flex-1 py-2.5 rounded-xl text-sm ${
                  dark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={saveEdit}
                className="flex-1 py-2.5 rounded-xl text-sm bg-indigo-600 text-white font-semibold disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
