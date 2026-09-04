import { useState, useEffect } from 'react';
import api from '../../services/api';

const DAY_OPTIONS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

export default function AdminOutlets() {
  const [outlets, setOutlets] = useState([]);
  const [omrs, setOmrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);
  const [assigningId, setAssigningId] = useState(null);

  const [form, setForm] = useState({
    name: '',
    contactName: '',
    contactPhone: '',
    address: '',
    lat: '',
    lng: '',
    assignedTo: '',
    assignedDays: [],
    notes: '',
  });

  const [assignForm, setAssignForm] = useState({
    assignedTo: '',
    assignedDays: [],
  });

  const load = async () => {
    setLoading(true);
    try {
      const [oRes, uRes] = await Promise.all([
        api.get('/admin/outlets'),
        api.get('/admin/users?role=omr'),
      ]);
      setOutlets(oRes.data);
      setOmrs(uRes.data);
    } catch {
      setStatus({ type: 'error', msg: 'Failed to load' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggleDay = (days, day) =>
    days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort();

  const useMyGps = () => {
    if (!navigator.geolocation) {
      setStatus({ type: 'error', msg: 'GPS not available' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          lat: String(pos.coords.latitude),
          lng: String(pos.coords.longitude),
        }));
      },
      () => setStatus({ type: 'error', msg: 'Turn on GPS' }),
      { enableHighAccuracy: true }
    );
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      await api.post('/admin/outlets', {
        ...form,
        lat: Number(form.lat),
        lng: Number(form.lng),
        assignedTo: form.assignedTo || undefined,
        assignedDays: form.assignedDays,
        autoApprove: !!(form.assignedTo && form.assignedDays.length),
      });
      setStatus({ type: 'success', msg: 'Outlet created' });
      setForm({
        name: '',
        contactName: '',
        contactPhone: '',
        address: '',
        lat: '',
        lng: '',
        assignedTo: '',
        assignedDays: [],
        notes: '',
      });
      setShowForm(false);
      load();
    } catch (err) {
      setStatus({ type: 'error', msg: err.response?.data?.message || 'Failed' });
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = async (outletId) => {
    if (!assignForm.assignedTo || assignForm.assignedDays.length === 0) {
      setStatus({ type: 'error', msg: 'Select OMR and at least one day' });
      return;
    }
    try {
      await api.patch(`/admin/outlets/${outletId}/assign`, assignForm);
      setStatus({ type: 'success', msg: 'Outlet assigned to beat days' });
      setAssigningId(null);
      load();
    } catch (err) {
      setStatus({ type: 'error', msg: err.response?.data?.message || 'Failed' });
    }
  };

  const dayLabel = (days) => {
    const map = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' };
    return (days || []).map((d) => map[d]).join(', ') || '—';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Outlets & Beats</h2>
          <p className="text-sm text-slate-500">Create outlets and assign to OMR weekdays</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-navy text-white text-xs font-semibold px-3 py-2 rounded-lg"
        >
          {showForm ? 'Cancel' : '+ Create Outlet'}
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
            placeholder="Outlet name *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border rounded-xl px-4 py-3 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="Contact"
              value={form.contactName}
              onChange={(e) => setForm({ ...form, contactName: e.target.value })}
              className="w-full border rounded-xl px-4 py-3 text-sm"
            />
            <input
              placeholder="Phone"
              value={form.contactPhone}
              onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
              className="w-full border rounded-xl px-4 py-3 text-sm"
            />
          </div>
          <input
            placeholder="Address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="w-full border rounded-xl px-4 py-3 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              required
              placeholder="Latitude *"
              value={form.lat}
              onChange={(e) => setForm({ ...form, lat: e.target.value })}
              className="w-full border rounded-xl px-4 py-3 text-sm"
            />
            <input
              required
              placeholder="Longitude *"
              value={form.lng}
              onChange={(e) => setForm({ ...form, lng: e.target.value })}
              className="w-full border rounded-xl px-4 py-3 text-sm"
            />
          </div>
          <button type="button" onClick={useMyGps} className="text-xs text-navy font-medium">
            Use my current GPS
          </button>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Assign to OMR</label>
            <select
              value={form.assignedTo}
              onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
              className="w-full border rounded-xl px-4 py-3 text-sm bg-white"
            >
              <option value="">Select OMR (optional now)</option>
              {omrs.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.fullName} · {u.territory || '—'} · {u.distributor || '—'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Beat days (Mon–Fri for OMR)</label>
            <div className="flex flex-wrap gap-2">
              {DAY_OPTIONS.filter((d) => d.value <= 5).map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() =>
                    setForm({ ...form, assignedDays: toggleDay(form.assignedDays, d.value) })
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                    form.assignedDays.includes(d.value)
                      ? 'bg-navy text-white border-navy'
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-navy text-white font-semibold py-3 rounded-xl disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Create Outlet'}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Loading...</p>
      ) : outlets.length === 0 ? (
        <p className="text-sm text-slate-400">No outlets yet</p>
      ) : (
        <div className="space-y-2">
          {outlets.map((o) => (
            <div key={o._id} className="bg-white border border-slate-200 rounded-xl p-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium text-sm">{o.name}</div>
                  <div className="text-xs text-slate-500">
                    {o.assignedTo?.fullName || o.createdBy} · {o.status}
                  </div>
                  <div className="text-xs text-slate-400">Days: {dayLabel(o.assignedDays)}</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAssigningId(assigningId === o._id ? null : o._id);
                    setAssignForm({
                      assignedTo: o.assignedTo?._id || o.assignedTo || '',
                      assignedDays: o.assignedDays || [],
                    });
                  }}
                  className="text-xs bg-slate-100 px-2 py-1 rounded-lg"
                >
                  Assign
                </button>
              </div>

              {assigningId === o._id && (
                <div className="mt-3 border-t border-slate-100 pt-3 space-y-2">
                  <select
                    value={assignForm.assignedTo}
                    onChange={(e) => setAssignForm({ ...assignForm, assignedTo: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                  >
                    <option value="">Select OMR</option>
                    {omrs.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.fullName}
                      </option>
                    ))}
                  </select>
                  <div className="flex flex-wrap gap-1">
                    {DAY_OPTIONS.filter((d) => d.value <= 5).map((d) => (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() =>
                          setAssignForm({
                            ...assignForm,
                            assignedDays: toggleDay(assignForm.assignedDays, d.value),
                          })
                        }
                        className={`px-2 py-1 rounded text-xs border ${
                          assignForm.assignedDays.includes(d.value)
                            ? 'bg-navy text-white border-navy'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAssign(o._id)}
                    className="w-full bg-navy text-white text-sm py-2 rounded-lg"
                  >
                    Save assignment
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
