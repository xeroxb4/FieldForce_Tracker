import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function Outlets() {
  const [outlets, setOutlets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    contactName: '',
    contactPhone: '',
    address: '',
    notes: '',
  });
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api
      .get('/outlets')
      .then((res) => setOutlets(res.data))
      .catch(() => setStatus({ type: 'error', msg: 'Failed to load outlets' }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setStatus(null);
    setSaving(true);

    if (!navigator.geolocation) {
      setStatus({
        type: 'error',
        msg: 'GPS not supported. Turn on location to create an outlet.',
      });
      setSaving(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await api.post('/outlets', {
            ...form,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          setStatus({
            type: 'success',
            msg: 'Outlet submitted for admin approval',
          });
          setForm({ name: '', contactName: '', contactPhone: '', address: '', notes: '' });
          setShowForm(false);
          load();
        } catch (err) {
          setStatus({
            type: 'error',
            msg: err.response?.data?.message || 'Failed to create outlet',
          });
        } finally {
          setSaving(false);
        }
      },
      () => {
        setStatus({
          type: 'error',
          msg: 'Location is off. Turn on GPS to create an outlet.',
        });
        setSaving(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const statusBadge = (s) => {
    const map = {
      pending: 'bg-amber-50 text-amber-700 border-amber-200',
      approved: 'bg-green-50 text-green-700 border-green-200',
      rejected: 'bg-red-50 text-red-700 border-red-200',
    };
    return map[s] || 'bg-slate-50 text-slate-600';
  };

  const dayLabel = (days) => {
    const names = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return (days || []).map((d) => names[d]).join(', ') || '—';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">My Outlets</h2>
          <p className="text-sm text-slate-500">Create shops for admin approval</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-navy text-white text-xs font-semibold px-3 py-2 rounded-lg"
        >
          {showForm ? 'Cancel' : '+ New Outlet'}
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
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 mb-4">
          <input
            required
            placeholder="Outlet / Shop name *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="Contact name"
              value={form.contactName}
              onChange={(e) => setForm({ ...form, contactName: e.target.value })}
              className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm"
            />
            <input
              placeholder="Phone"
              value={form.contactPhone}
              onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
              className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm"
            />
          </div>
          <input
            placeholder="Address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm"
          />
          <textarea
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm"
          />
          <p className="text-xs text-slate-400">GPS location will be captured when you save.</p>
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-navy text-white font-semibold py-3 rounded-xl disabled:opacity-60"
          >
            {saving ? 'Getting GPS & Saving...' : 'Submit for Approval'}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Loading...</p>
      ) : outlets.length === 0 ? (
        <p className="text-sm text-slate-400">No outlets yet. Create one to get started.</p>
      ) : (
        <div className="space-y-2">
          {outlets.map((o) => (
            <div key={o._id} className="bg-white border border-slate-200 rounded-xl p-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium text-sm text-slate-800">{o.name}</div>
                  {o.contactName && (
                    <div className="text-xs text-slate-500">{o.contactName} · {o.contactPhone}</div>
                  )}
                  {o.status === 'approved' && (
                    <div className="text-xs text-slate-400 mt-0.5">Days: {dayLabel(o.assignedDays)}</div>
                  )}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-lg border ${statusBadge(o.status)}`}>
                  {o.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
