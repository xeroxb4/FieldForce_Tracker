import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

const CAPACITY_BANDS = [
  { id: 'under_2000', label: 'Under GHS 2,000', min: 0 },
  { id: '2000_3999', label: 'GHS 2,000 – 3,999', min: 2000 },
  { id: '4000_5999', label: 'GHS 4,000 – 5,999', min: 4000 },
  { id: '6000_9999', label: 'GHS 6,000 – 9,999', min: 6000 },
  { id: '10000_12499', label: 'GHS 10,000 – 12,499', min: 10000 },
  { id: '12500_plus', label: 'GHS 12,500+', min: 12500 },
];

function classify(min) {
  const n = Number(min) || 0;
  const channelType = n >= 10000 ? 'Sub-wholesaler' : 'Mini-wholesaler';
  let suggestedAvcTier = '';
  if (n >= 12500) suggestedAvcTier = 'Gold';
  else if (n >= 10000) suggestedAvcTier = 'Silver';
  else if (n >= 5000) suggestedAvcTier = 'Bronze';
  return { channelType, suggestedAvcTier };
}

const emptyForm = {
  name: '',
  contactName: '',
  contactPhone: '',
  address: '',
  notes: '',
  monthlyCapacityBand: '',
  monthlyCapacityMin: 0,
  channelType: '',
  avcEnrolled: false,
  avcTier: '',
};

export default function Outlets() {
  const { dark } = useTheme();
  const [outlets, setOutlets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);
  const [avcPrompt, setAvcPrompt] = useState(null); // { tier, channelType }

  const inputCls = `w-full rounded-xl px-4 py-3 text-sm border ${
    dark
      ? 'bg-slate-900 border-slate-600 text-white placeholder:text-slate-500'
      : 'bg-white border-[#117ea6]/50 text-slate-900'
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

  const onCapacityChange = (bandId) => {
    const band = CAPACITY_BANDS.find((b) => b.id === bandId);
    if (!band) {
      setForm((f) => ({
        ...f,
        monthlyCapacityBand: '',
        monthlyCapacityMin: 0,
        channelType: '',
        avcEnrolled: false,
        avcTier: '',
      }));
      setAvcPrompt(null);
      return;
    }
    const { channelType, suggestedAvcTier } = classify(band.min);
    setForm((f) => ({
      ...f,
      monthlyCapacityBand: band.id,
      monthlyCapacityMin: band.min,
      channelType,
      // keep AVC only if still enrolled; tier may refresh via prompt
      avcEnrolled: f.avcEnrolled && suggestedAvcTier ? f.avcEnrolled : false,
      avcTier: f.avcEnrolled && suggestedAvcTier ? suggestedAvcTier : f.avcEnrolled ? f.avcTier : '',
    }));
    if (suggestedAvcTier) {
      setAvcPrompt({ tier: suggestedAvcTier, channelType, capacityLabel: band.label });
    } else {
      setAvcPrompt(null);
      setForm((f) => ({ ...f, avcEnrolled: false, avcTier: '' }));
    }
  };

  const acceptAvc = () => {
    if (!avcPrompt) return;
    setForm((f) => ({
      ...f,
      avcEnrolled: true,
      avcTier: avcPrompt.tier,
      channelType: avcPrompt.channelType,
    }));
    setAvcPrompt(null);
  };

  const declineAvc = () => {
    setForm((f) => ({ ...f, avcEnrolled: false, avcTier: '' }));
    setAvcPrompt(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setStatus(null);

    if (!form.monthlyCapacityBand) {
      setStatus({ type: 'error', msg: 'Select monthly purchase capacity' });
      return;
    }

    const atShop = window.confirm(
      'IMPORTANT\n\nYou must be STANDING AT THIS SHOP when you create it.\n\nThe app will save your current GPS as the shop location.\n\nAre you at "' +
        (form.name || 'this shop') +
        '" right now?'
    );
    if (!atShop) {
      setStatus({
        type: 'error',
        msg: 'Go to the shop first, then create the outlet so the GPS pin is exact.',
      });
      return;
    }

    setSaving(true);

    if (!navigator.geolocation) {
      setStatus({ type: 'error', msg: 'GPS not supported. Turn on location to create an outlet.' });
      setSaving(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const classified = classify(form.monthlyCapacityMin);
          await api.post('/outlets', {
            ...form,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            locationVerified: true,
            channelType: form.channelType || classified.channelType,
            monthlyCapacityBand: form.monthlyCapacityBand,
            monthlyCapacityMin: form.monthlyCapacityMin,
            avcEnrolled: form.avcEnrolled,
            avcTier: form.avcEnrolled ? form.avcTier : '',
          });
          setStatus({ type: 'success', msg: 'Outlet submitted for admin approval (GPS saved at shop)' });
          setForm({ ...emptyForm });
          setShowForm(false);
          setAvcPrompt(null);
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

  const bandLabel = (id) => CAPACITY_BANDS.find((b) => b.id === id)?.label || id || '';

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className={`text-lg font-bold ${dark ? 'text-white' : 'text-slate-800'}`}>My Outlets</h2>
          <p className={`text-sm ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
            Create shops · capacity sets Mini / Sub-wholesaler · AVC when eligible
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowForm(!showForm);
            setAvcPrompt(null);
          }}
          className="bg-[#117ea6] text-white text-xs font-semibold px-3 py-2 rounded-lg"
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

      {/* Hurray AVC popup */}
      {avcPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            className={`w-full max-w-sm rounded-2xl p-5 shadow-xl ${
              dark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'
            }`}
          >
            <div className="text-3xl text-center mb-2">🎉</div>
            <h3 className="text-lg font-extrabold text-center text-[#117ea6]">Hurray!</h3>
            <p className={`text-sm text-center mt-2 ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
              Based on monthly purchase capacity ({avcPrompt.capacityLabel}), this customer can join the{' '}
              <strong>AVC programme</strong>.
            </p>
            <p className="text-center font-bold mt-3">
              Suggested tier: <span className="text-amber-500">{avcPrompt.tier}</span>
            </p>
            <p className={`text-xs text-center mt-1 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
              Classified as {avcPrompt.channelType}
            </p>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button
                type="button"
                onClick={declineAvc}
                className={`py-2.5 rounded-xl text-sm font-bold border ${
                  dark ? 'border-slate-600' : 'border-slate-300'
                }`}
              >
                Not now
              </button>
              <button
                type="button"
                onClick={acceptAvc}
                className="py-2.5 rounded-xl text-sm font-bold bg-[#117ea6] text-white"
              >
                Add to AVC
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className={`rounded-xl border p-4 space-y-3 mb-4 ${
            dark
              ? 'bg-slate-800 border-slate-700'
              : 'bg-gradient-to-r from-sky-50 to-teal-50 border-sky-200 shadow-md'
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
            placeholder="Address / landmark"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className={inputCls}
          />

          <div>
            <label className={`text-xs font-bold ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
              Monthly purchase capacity *
            </label>
            <select
              required
              value={form.monthlyCapacityBand}
              onChange={(e) => onCapacityChange(e.target.value)}
              className={`mt-1 ${inputCls}`}
            >
              <option value="">Select capacity…</option>
              {CAPACITY_BANDS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>

          {form.channelType && (
            <div
              className={`text-sm rounded-xl px-3 py-2 border ${
                dark ? 'border-slate-600 bg-slate-900' : 'border-[#117ea6]/30 bg-white'
              }`}
            >
              <span className={dark ? 'text-slate-400' : 'text-slate-500'}>Classified as: </span>
              <strong className="text-[#117ea6]">{form.channelType}</strong>
              <span className={`text-xs block mt-0.5 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
                Mini-wholesaler = under GHS 10,000 · Sub-wholesaler = GHS 10,000+
              </span>
            </div>
          )}

          {form.avcEnrolled && form.avcTier && (
            <div className="text-sm font-semibold text-amber-500">
              AVC {form.avcTier} selected — will show as: {form.name || 'Shop'} - AVC ({form.avcTier})
            </div>
          )}

          <textarea
            placeholder="Notes (optional)"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
            className={inputCls}
          />
          <p className={`text-xs ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
            You must be at the shop. GPS is captured on save.
          </p>
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-[#117ea6] text-white font-semibold py-3 rounded-xl disabled:opacity-60"
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
                dark
                  ? 'bg-slate-800 border-slate-700'
                  : 'bg-gradient-to-r from-sky-50 to-teal-50 border-sky-200 shadow-md'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className={`font-medium text-sm ${dark ? 'text-white' : 'text-slate-800'}`}>
                    {o.displayName || o.name}
                  </div>
                  {(o.channelType || o.monthlyCapacityBand) && (
                    <div className={`text-[11px] ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {o.channelType}
                      {o.monthlyCapacityBand ? ` · ${bandLabel(o.monthlyCapacityBand)}` : ''}
                    </div>
                  )}
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
                  {o.locationVerified === false ? ' · Pin not verified' : ''}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
