import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { usePremium, PremiumHero } from '../../lib/premium';

const CAPACITY_BANDS = [
  { id: 'under_3999', label: 'Under GHS 3,000', min: 0 },
  { id: '4000_5999', label: 'GHS 4,000 – 5,999', min: 4000 },
  { id: '6000_9999', label: 'GHS 6,000 – 9,999', min: 6000 },
  { id: '10000_12499', label: 'GHS 10,000 – 12,499', min: 10000 },
  { id: '12500_plus', label: 'GHS 12,500+', min: 12500 },
];

const CAPACITY_LABELS = {
  under_3999: 'Under GHS 3,000',
  under_2000: 'Under GHS 2,000',
  '2000_3999': 'GHS 2,000 – 3,999',
  '4000_5999': 'GHS 4,000 – 5,999',
  '6000_9999': 'GHS 6,000 – 9,999',
  '10000_12499': 'GHS 10,000 – 12,499',
  '12500_plus': 'GHS 12,500+',
  under_10000: 'Under GHS 10,000',
  from_10000: 'GHS 10,000+',
};

function classify(min) {
  const n = Number(min) || 0;
  let channelType = 'Open Market - Small Wholesaler';
  if (n >= 12500) channelType = 'Open Market - Sub Wholesaler';
  else if (n >= 10000) channelType = 'Open Market - Large Wholesaler';
  else if (n >= 6000) channelType = 'Open Market - Medium-Large Wholesaler';
  else if (n >= 4000) channelType = 'Open Market - Medium Wholesaler';
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
  const p = usePremium(dark);
  const [outlets, setOutlets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);
  const [avcPrompt, setAvcPrompt] = useState(null); // { tier, channelType }
  const [capacitySheetOpen, setCapacitySheetOpen] = useState(false);

  const inputCls = p.input;

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

  const bandLabel = (id) => CAPACITY_LABELS[id] || CAPACITY_BANDS.find((b) => b.id === id)?.label || id || '';

  return (
    <div className={`-mx-4 -mt-2 px-4 pb-12 min-h-[70vh] ${p.shell}`}>
      <PremiumHero
        dark={dark}
        eyebrow="Universe"
        title="My Outlets"
        subtitle="Create shops · capacity · AVC eligibility"
        right={
          <button
            type="button"
            onClick={() => {
              setShowForm(!showForm);
              setAvcPrompt(null);
            }}
            className="shrink-0 rounded-2xl px-4 py-2.5 text-xs font-black text-white"
            style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)' }}
          >
            {showForm ? 'Cancel' : '+ New'}
          </button>
        }
      />

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
            <h3 className="text-lg font-extrabold text-center text-[#3F258B]">Hurray!</h3>
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
                className="py-2.5 rounded-xl text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #5b3aad, #3F258B)' }}
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
          className={`p-5 space-y-4 mb-5 ${p.glass}`}
          style={p.glassStyle}
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
            <button
              type="button"
              onClick={() => setCapacitySheetOpen(true)}
              className={`mt-1.5 w-full rounded-2xl px-4 py-3.5 text-left flex items-center justify-between gap-3 border transition active:scale-[0.99] ${
                dark
                  ? 'bg-slate-950/80 border-white/12 text-white'
                  : 'bg-white border-slate-300 text-slate-900 shadow-[0_8px_24px_rgba(15,23,42,0.08)]'
              }`}
            >
              <div className="min-w-0">
                <div
                  className={`text-[10px] font-black uppercase tracking-wider ${
                    dark ? 'text-violet-300/80' : 'text-[#3F258B]'
                  }`}
                >
                  Capacity band
                </div>
                <div
                  className={`text-sm font-bold truncate mt-0.5 ${
                    form.monthlyCapacityBand
                      ? dark
                        ? 'text-white'
                        : 'text-slate-900'
                      : dark
                      ? 'text-slate-400'
                      : 'text-slate-500'
                  }`}
                >
                  {form.monthlyCapacityBand
                    ? bandLabel(form.monthlyCapacityBand)
                    : 'Tap to select capacity…'}
                </div>
              </div>
              <span
                className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-black"
                style={{
                  background: 'linear-gradient(145deg, #5b3aad, #3F258B)',
                  boxShadow: '0 8px 18px rgba(63,37,139,0.35)',
                }}
              >
                ▾
              </span>
            </button>
            {/* hidden required field for form validation */}
            <input type="hidden" value={form.monthlyCapacityBand} required readOnly />
          </div>

          {capacitySheetOpen && (
            <div className="fixed inset-0 z-[80] flex items-end justify-center">
              <button
                type="button"
                className="absolute inset-0 bg-black/55 backdrop-blur-sm"
                aria-label="Close"
                onClick={() => setCapacitySheetOpen(false)}
              />
              <div
                className={`relative w-full max-w-lg max-h-[72vh] rounded-t-[1.75rem] flex flex-col overflow-hidden ${
                  dark ? 'bg-slate-950 border-t border-white/10' : 'bg-white'
                }`}
                style={{
                  boxShadow:
                    '0 -12px 48px rgba(0,0,0,0.35), 0 1px 0 rgba(255,255,255,0.12) inset',
                }}
              >
                <div className="flex justify-center pt-3 pb-1">
                  <div className={`w-10 h-1 rounded-full ${dark ? 'bg-white/20' : 'bg-slate-300'}`} />
                </div>
                <div className="px-4 pb-3 pt-1 flex items-center justify-between gap-3">
                  <div>
                    <p
                      className={`text-[10px] font-black uppercase tracking-[0.2em] ${
                        dark ? 'text-violet-300/90' : 'text-[#3F258B]'
                      }`}
                    >
                      Monthly purchase
                    </p>
                    <p className={`text-base font-black ${dark ? 'text-white' : 'text-slate-900'}`}>
                      Select capacity
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCapacitySheetOpen(false)}
                    className={`text-xs font-bold px-3 py-2 rounded-xl ${
                      dark ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    Close
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto px-3 pb-8 space-y-2">
                  {CAPACITY_BANDS.map((b) => {
                    const active = form.monthlyCapacityBand === b.id;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => {
                          onCapacityChange(b.id);
                          setCapacitySheetOpen(false);
                        }}
                        className={`w-full text-left rounded-2xl px-4 py-4 flex items-center justify-between gap-3 border transition ${
                          active
                            ? dark
                              ? 'bg-violet-500/20 border-violet-400/40'
                              : 'bg-violet-50 border-[#3F258B]/35'
                            : dark
                            ? 'bg-slate-900/70 border-white/8'
                            : 'bg-white border-slate-200 shadow-sm'
                        }`}
                        style={
                          active
                            ? {
                                boxShadow: dark
                                  ? '0 8px 24px rgba(171,107,240,0.25)'
                                  : '0 8px 24px rgba(63,37,139,0.12)',
                              }
                            : dark
                            ? undefined
                            : {
                                boxShadow:
                                  '0 1px 0 rgba(255,255,255,1) inset, 0 6px 16px rgba(15,23,42,0.06)',
                              }
                        }
                      >
                        <span className={`text-sm font-black ${dark ? 'text-white' : 'text-slate-900'}`}>
                          {b.label}
                        </span>
                        <span
                          className={`w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center text-xs ${
                            active
                              ? 'border-transparent text-white'
                              : dark
                              ? 'border-slate-600'
                              : 'border-slate-300'
                          }`}
                          style={
                            active
                              ? { background: 'linear-gradient(145deg, #5b3aad, #3F258B)' }
                              : undefined
                          }
                        >
                          {active ? '✓' : ''}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {form.channelType && (
            <div
              className={`rounded-2xl p-4 border ${
                dark
                  ? 'border-white/10 bg-gradient-to-br from-white/[0.07] via-white/[0.03] to-transparent'
                  : 'border-violet-200/80 bg-gradient-to-br from-violet-50 to-white'
              }`}
              style={
                dark
                  ? { boxShadow: '0 16px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)' }
                  : { boxShadow: '0 8px 24px rgba(63,37,139,0.08)' }
              }
            >
              <p
                className={`text-[10px] font-black uppercase tracking-[0.18em] mb-1.5 ${
                  dark ? 'text-violet-300/90' : 'text-[#3F258B]'
                }`}
              >
                Classification
              </p>
              <p className={`text-base font-black ${dark ? 'text-white' : 'text-slate-900'}`}>
                {form.channelType}
              </p>
              <p className={`text-xs mt-1.5 leading-relaxed ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                Based on monthly purchase capacity{' '}
                <span className="font-semibold">{bandLabel(form.monthlyCapacityBand)}</span>.
                This is how the outlet is tagged for reporting and AVC eligibility.
              </p>
            </div>
          )}
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
            className={`w-full ${p.btnPrimary} disabled:opacity-60`}
            style={p.btnPrimaryStyle}
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
              className={`p-4 mb-1 ${p.card3d}`}
              style={p.card3dStyle}
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
