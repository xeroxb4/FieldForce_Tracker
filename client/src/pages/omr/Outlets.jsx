import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

const DAY_LABEL = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' };

const AVC_TIERS = [
  { id: 'Gold', target: 12500 },
  { id: 'Silver', target: 10000 },
  { id: 'Bronze', target: 5000 },
];

export default function Outlets() {
  const { dark } = useTheme();
  const [outlets, setOutlets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    contactName: '',
    contactPhone: '',
    address: '',
    notes: '',
    avcEnrolled: false,
    avcTier: 'Gold',
  });
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);

  const inputCls = `w-full rounded-xl px-4 py-3 text-sm border ${
    dark
      ? 'bg-slate-900 border-slate-600 text-white placeholder:text-slate-500'
      : 'bg-white border-slate-300 text-slate-900'
  }`;

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
      setStatus({ type: 'error', msg: 'GPS not supported. Turn on location to create an outlet.' });
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
            avcEnrolled: form.avcEnrolled,
            avcTier: form.avcEnrolled ? form.avcTier : '',
          });
          setStatus({ type: 'success', msg: 'Outlet submitted for admin approval' });
          setForm({
            name: '',
            contactName: '',
            contactPhone: '',
            address: '',
            notes: '',
            avcEnrolled: false,
            avcTier: 'Gold',
          });
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
        setStatus({ type: 'error', msg: 'Location is off. Turn on GPS to create an outlet.' });
        setSaving(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const statusBadge = (s) => {
    const map = {
      pending: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
      approved: 'bg-green-500/10 text-green-500 border-green-500/30',
      rejected: 'bg-red-500/10 text-red-400 border-red-500/30',
    };
    return map[s] || '';
  };

  const dayLabel = (days) => {
    const names = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return (days || []).map((d) => names[d]).join(', ') || '—';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className={`text-lg font-bold ${dark ? 'text-white' : 'text-slate-800'}`}>My Outlets</h2>
          <p className={`text-sm ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
            Create shops · optional AVC program
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 text-white text-xs font-semibold px-3 py-2 rounded-lg"
        >
          {showForm ? 'Cancel' : '+ New Outlet'}
        </button>
      </div>

      {status && (
        <div
          className={`text-sm px-4 py-3 rounded-xl border mb-3 ${
            status.type === 'success'
              ? 'bg-green-500/10 text-green-500 border-green-500/20'
              : 'bg-red-500/10 text-red-500 border-red-500/20'
          }`}
        >
          {status.msg}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className={`rounded-xl border p-4 space-y-3 mb-4 ${
            dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
          }`}
        >
          <input
            required
            placeholder="Outlet / Shop name *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputCls}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="Contact name"
              value={form.contactName}
              onChange={(e) => setForm({ ...form, contactName: e.target.value })}
              className={inputCls}
            />
            <input
              placeholder="Phone"
              value={form.contactPhone}
              onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
              className={inputCls}
            />
          </div>
          <input
            placeholder="Address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className={inputCls}
          />

          {/* AVC Program */}
          <div
            className={`rounded-xl border p-3 space-y-2 ${
              dark ? 'border-slate-600 bg-slate-900' : 'border-slate-200 bg-slate-50'
            }`}
          >
            <label className={`flex items-center gap-2 text-sm font-medium ${dark ? 'text-white' : 'text-slate-800'}`}>
              <input
                type="checkbox"
                checked={form.avcEnrolled}
                onChange={(e) => setForm({ ...form, avcEnrolled: e.target.checked })}
                className="rounded"
              />
              Customer wants AVC program
            </label>
            {form.avcEnrolled && (
              <div className="space-y-2">
                <p className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Select tier (monthly target)
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {AVC_TIERS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setForm({ ...form, avcTier: t.id })}
                      className={`py-2 rounded-lg text-xs font-semibold border ${
                        form.avcTier === t.id
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : dark
                          ? 'bg-slate-800 text-slate-300 border-slate-600'
                          : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      {t.id}
                      <div className="font-normal opacity-80">GHS {t.target.toLocaleString()}</div>
                    </button>
                  ))}
                </div>
                {form.name && (
                  <p className={`text-xs ${dark ? 'text-indigo-300' : 'text-indigo-600'}`}>
                    Will show as: <strong>{form.name} - AVC ({form.avcTier})</strong>
                  </p>
                )}
              </div>
            )}
          </div>

          <textarea
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
            className={inputCls}
          />
          <p className={`text-xs ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
            GPS location will be captured when you save.
          </p>
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-xl disabled:opacity-60"
          >
            {saving ? 'Getting GPS & Saving...' : 'Submit for Approval'}
          </button>
        </form>
      )}

      {loading ? (
        <p className={`text-sm ${dark ? 'text-slate-400' : 'text-slate-400'}`}>Loading...</p>
      ) : outlets.length === 0 ? (
        <p className={`text-sm ${dark ? 'text-slate-400' : 'text-slate-400'}`}>
          No outlets yet. Create one to get started.
        </p>
      ) : (
        <div className="space-y-2">
          {outlets.map((o) => (
            <div
              key={o._id}
              className={`rounded-xl border p-3 ${
                dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className={`font-medium text-sm ${dark ? 'text-white' : 'text-slate-800'}`}>
                    {o.displayName || o.name}
                  </div>
                  {o.avcEnrolled && (
                    <div className="text-[10px] text-amber-500 font-medium">
                      AVC {o.avcTier} · Target GHS {(o.avcTarget || 0).toLocaleString()}
                    </div>
                  )}
                  {o.contactName && (
                    <div className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {o.contactName} · {o.contactPhone}
                    </div>
                  )}
                  {o.status === 'approved' && (
                    <div className={`text-xs ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
                      Days: {dayLabel(o.assignedDays)}
                    </div>
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
