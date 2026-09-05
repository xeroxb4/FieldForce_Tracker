import { useState, useEffect, useMemo } from 'react';
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

const DISTRIBUTORS = ['Amata', 'Daddy Ash', 'Daniel Adjei', 'Ernievero', 'Nivea Ghana'];

export default function AdminOutlets() {
  const { dark } = useTheme();
  const [outlets, setOutlets] = useState([]);
  const [reps, setReps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [filterRole, setFilterRole] = useState('all'); // all | omr | merchandiser
  const [filterRep, setFilterRep] = useState('');
  const [filterDist, setFilterDist] = useState('');
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const inputCls = `w-full rounded-xl px-3 py-2.5 text-sm border-2 font-medium ${
    dark ? 'bg-slate-900 border-slate-600 text-white' : 'bg-white border-[#2596be]/40 text-slate-900'
  }`;

  const load = async () => {
    setLoading(true);
    try {
      const [oRes, uRes, mRes] = await Promise.all([
        api.get('/admin/outlets'),
        api.get('/admin/users?role=omr'),
        api.get('/admin/users?role=merchandiser'),
      ]);
      setOutlets(oRes.data);
      setReps([...uRes.data, ...mRes.data]);
    } catch {
      setStatus({ type: 'error', msg: 'Failed to load' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredReps = useMemo(() => {
    return reps.filter((u) => {
      if (filterRole !== 'all' && u.role !== filterRole) return false;
      if (filterDist && !(u.distributor || '').toLowerCase().includes(filterDist.toLowerCase()))
        return false;
      return true;
    });
  }, [reps, filterRole, filterDist]);

  const filteredOutlets = useMemo(() => {
    return outlets.filter((o) => {
      const repId = o.assignedTo?._id || o.assignedTo;
      const rep = reps.find((r) => r._id === repId);
      if (filterRole !== 'all' && rep && rep.role !== filterRole) return false;
      if (filterRole !== 'all' && !rep) return false;
      if (filterRep && String(repId) !== filterRep) return false;
      if (filterDist) {
        const dist = (rep?.distributor || o.distributor || '').toLowerCase();
        if (!dist.includes(filterDist.toLowerCase())) return false;
      }
      return true;
    });
  }, [outlets, reps, filterRole, filterRep, filterDist]);

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
      <h2 className={`text-lg font-extrabold mb-1 ${dark ? 'text-white' : 'text-slate-900'}`}>
        Outlets & Beats
      </h2>
      <p className={`text-sm mb-4 font-medium ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
        Filter by role, rep, and distributor. Edit beat days & AVC.
      </p>

      {status && (
        <div
          className={`mb-3 text-sm px-3 py-2 rounded-xl font-medium ${
            status.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {status.msg}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
        <div>
          <label className={`text-xs font-bold ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
            Role
          </label>
          <select className={inputCls} value={filterRole} onChange={(e) => { setFilterRole(e.target.value); setFilterRep(''); }}>
            <option value="all">OMRs & Merchandisers</option>
            <option value="omr">OMRs only</option>
            <option value="merchandiser">Merchandisers only</option>
          </select>
        </div>
        <div>
          <label className={`text-xs font-bold ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
            Distributor
          </label>
          <select className={inputCls} value={filterDist} onChange={(e) => setFilterDist(e.target.value)}>
            <option value="">All distributors</option>
            {DISTRIBUTORS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={`text-xs font-bold ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
            Rep
          </label>
          <select className={inputCls} value={filterRep} onChange={(e) => setFilterRep(e.target.value)}>
            <option value="">All reps</option>
            {filteredReps.map((u) => (
              <option key={u._id} value={u._id}>
                {u.fullName} ({u.role})
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className={`text-xs mb-2 font-semibold ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
        Showing {filteredOutlets.length} outlet(s)
      </p>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : filteredOutlets.length === 0 ? (
        <p className="text-sm text-slate-500">No outlets match filters.</p>
      ) : (
        <div className="space-y-2">
          {filteredOutlets.map((o) => (
            <div
              key={o._id}
              className={`rounded-2xl border-2 p-3 ${
                dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-[#2596be]/40 shadow-sm'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
                <div className="min-w-0">
                  <div className={`font-bold text-sm ${dark ? 'text-white' : 'text-slate-900'}`}>
                    {o.displayName || o.name}
                  </div>
                  <div className={`text-xs mt-0.5 font-medium ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {o.assignedTo?.fullName || 'Unassigned'} · {o.status}
                    {o.assignedDays?.length > 0 &&
                      ` · ${o.assignedDays.map((d) => DAY_LABEL[d]).join(', ')}`}
                  </div>
                  {o.avcEnrolled && (
                    <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 font-bold">
                      AVC {o.avcTier}
                    </span>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button type="button" onClick={() => openEdit(o)} className="text-xs px-3 py-1.5 rounded-lg bg-[#2596be] text-white font-bold">
                    Edit
                  </button>
                  <button type="button" onClick={() => remove(o._id)} className="text-xs px-3 py-1.5 rounded-lg bg-red-500/15 text-red-500 font-bold">
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-3 sm:p-4">
          <div className={`w-full max-w-md max-h-[92vh] overflow-y-auto rounded-2xl p-4 space-y-3 ${dark ? 'bg-slate-900' : 'bg-white'}`}>
            <h3 className={`font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>Edit outlet</h3>
            <div>
              <label className="text-xs font-bold text-slate-500">Name</label>
              <input className={inputCls} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold text-slate-500">Contact</label>
                <input className={inputCls} value={editing.contactName} onChange={(e) => setEditing({ ...editing, contactName: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500">Phone</label>
                <input className={inputCls} value={editing.contactPhone} onChange={(e) => setEditing({ ...editing, contactPhone: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500">Address</label>
              <input className={inputCls} value={editing.address} onChange={(e) => setEditing({ ...editing, address: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500">Assign to</label>
              <select className={inputCls} value={editing.assignedTo} onChange={(e) => setEditing({ ...editing, assignedTo: e.target.value })}>
                <option value="">—</option>
                {reps.map((u) => (
                  <option key={u._id} value={u._id}>{u.fullName} ({u.role})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Beat days</label>
              <div className="flex flex-wrap gap-1">
                {DAY_OPTIONS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => toggleDay(d.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                      editing.assignedDays.includes(d.value)
                        ? 'bg-[#2596be] text-white'
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
            <div className={`rounded-xl border-2 p-3 ${dark ? 'border-slate-700' : 'border-slate-200'}`}>
              <label className="flex items-center gap-2 text-sm font-semibold">
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
                AVC program
              </label>
              {editing.avcEnrolled && (
                <select className={`${inputCls} mt-2`} value={editing.avcTier} onChange={(e) => setEditing({ ...editing, avcTier: e.target.value })}>
                  <option value="Gold">Gold (GHC 12,500)</option>
                  <option value="Silver">Silver (GHC 10,000)</option>
                  <option value="Bronze">Bronze (GHC 5,000)</option>
                </select>
              )}
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setEditing(null)} className={`flex-1 py-2.5 rounded-xl text-sm font-bold ${dark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
                Cancel
              </button>
              <button type="button" disabled={saving} onClick={saveEdit} className="flex-1 py-2.5 rounded-xl text-sm bg-[#2596be] text-white font-bold disabled:opacity-60">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
