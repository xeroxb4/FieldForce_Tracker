import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

function Ring({ pct, size = 88, color = '#6366f1', track, value, label }) {
  const r = 15.5;
  const dash = Math.min(100, Math.max(0, pct)) * 0.97;
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r={r} fill="none" stroke={track} strokeWidth="3" />
        <circle
          cx="18"
          cy="18"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeDasharray={`${dash} 100`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold leading-none" style={{ color }}>
          {value}
        </span>
        <span className="text-[9px] opacity-60 mt-0.5">{label}</span>
      </div>
    </div>
  );
}

export default function MerchDashboard() {
  const { user } = useAuth();
  const { dark, toggle } = useTheme();
  const [attendance, setAttendance] = useState(null);
  const [beat, setBeat] = useState(null);
  const [visitsToday, setVisitsToday] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gpsError, setGpsError] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  const load = async () => {
    setLoading(true);
    try {
      const [aRes, bRes, vRes] = await Promise.all([
        api.get('/attendance/today'),
        api.get('/beats/today').catch(() => ({ data: null })),
        api.get(`/merchandiser/visits?date=${today}`).catch(() => ({ data: [] })),
      ]);
      setAttendance(aRes.data);
      setBeat(bRes.data);
      setVisitsToday(vRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCheckIn = () => {
    setGpsError('');
    setCheckingIn(true);
    if (!navigator.geolocation) {
      setGpsError('GPS not supported. Turn on location or you will be marked absent.');
      setCheckingIn(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await api.post('/attendance/check-in', {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
          await load();
        } catch (err) {
          setGpsError(err.response?.data?.message || 'Failed to check in');
        } finally {
          setCheckingIn(false);
        }
      },
      () => {
        setGpsError(
          'Location is off. Turn on GPS to record attendance, or you will be marked absent.'
        );
        setCheckingIn(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const total = beat?.total || 0;
  const visited = beat?.visitedCount ?? 0;
  const notVisited = Math.max(0, total - visited);
  const coveragePct = total > 0 ? Math.round((visited / total) * 100) : 0;
  const track = dark ? '#334155' : '#e2e8f0';
  const card = dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-sm';

  const todayLabel = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  // Simple SOS aggregate from today's visits
  let sosCount = 0;
  let sosSum = 0;
  for (const v of visitsToday) {
    for (const row of v.sosRows || []) {
      if (row.totalCategoryFacings > 0) {
        sosCount += 1;
        sosSum += row.sosPct || 0;
      }
    }
  }
  const avgSos = sosCount > 0 ? Math.round((sosSum / sosCount) * 10) / 10 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-2">
      <div
        className={`rounded-3xl p-5 text-white relative overflow-hidden ${
          dark
            ? 'bg-gradient-to-br from-teal-900 to-indigo-900'
            : 'bg-gradient-to-br from-teal-600 to-indigo-600'
        }`}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="flex items-start justify-between relative">
          <div>
            <p className="text-teal-100 text-xs font-medium">Hi,</p>
            <h1 className="text-xl font-bold leading-tight">{user?.fullName}</h1>
            <p className="text-teal-100/80 text-xs mt-0.5">
              Merchandiser · {user?.territory || '—'} · {user?.distributor || '—'}
            </p>
          </div>
          <button
            type="button"
            onClick={toggle}
            className="text-xs bg-white/15 backdrop-blur px-2.5 py-1.5 rounded-full"
          >
            {dark ? '☀' : '☾'}
          </button>
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs text-teal-50">
          <span className="bg-white/15 px-2.5 py-1 rounded-lg">{todayLabel}</span>
          {attendance?.checkedIn ? (
            <span className="bg-emerald-500/30 text-emerald-100 px-2.5 py-1 rounded-lg">
              ✓ Present
            </span>
          ) : (
            <button
              type="button"
              onClick={handleCheckIn}
              disabled={checkingIn}
              className="bg-amber-400 text-amber-950 font-semibold px-2.5 py-1 rounded-lg disabled:opacity-60"
            >
              {checkingIn ? 'GPS...' : 'Check in'}
            </button>
          )}
        </div>
        {gpsError && (
          <p className="mt-2 text-xs text-red-200 bg-red-500/20 rounded-lg px-3 py-2">{gpsError}</p>
        )}
      </div>

      {/* Visit summary */}
      <div className={`rounded-2xl p-4 border ${card}`}>
        <div className="flex justify-between items-center mb-3">
          <h3 className={`text-sm font-semibold ${dark ? 'text-white' : 'text-slate-800'}`}>
            Visit Summary
          </h3>
          <span className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-400'}`}>
            {beat?.dayName || todayLabel}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Ring pct={coveragePct} color="#0d9488" track={track} value={total} label="Outlets" />
          <div className="flex-1 grid grid-cols-2 gap-2">
            <div className={`rounded-xl p-2.5 ${dark ? 'bg-slate-900' : 'bg-emerald-50'}`}>
              <div className="text-lg font-bold text-emerald-500">{visited}</div>
              <div className={`text-[10px] ${dark ? 'text-slate-400' : 'text-emerald-700'}`}>Visited</div>
            </div>
            <div className={`rounded-xl p-2.5 ${dark ? 'bg-slate-900' : 'bg-red-50'}`}>
              <div className="text-lg font-bold text-red-400">{notVisited}</div>
              <div className={`text-[10px] ${dark ? 'text-slate-400' : 'text-red-600'}`}>Not visited</div>
            </div>
            <div className={`col-span-2 rounded-xl p-2.5 ${dark ? 'bg-slate-900' : 'bg-teal-50'}`}>
              <div className={`text-[10px] ${dark ? 'text-slate-400' : 'text-teal-700'}`}>
                Coverage · visits logged today: {visitsToday.length}
              </div>
              <div className="text-sm font-bold text-teal-600">{coveragePct}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* SOS snapshot */}
      <div className={`rounded-2xl p-4 border ${card}`}>
        <h3 className={`text-sm font-semibold mb-2 ${dark ? 'text-white' : 'text-slate-800'}`}>
          Share of Shelf (today)
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <div className={`rounded-xl p-3 text-center ${dark ? 'bg-slate-900' : 'bg-indigo-50'}`}>
            <div className="text-[10px] text-indigo-500">Avg SOS %</div>
            <div className={`text-xl font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>
              {avgSos || '—'}
            </div>
          </div>
          <div className={`rounded-xl p-3 text-center ${dark ? 'bg-slate-900' : 'bg-slate-50'}`}>
            <div className={`text-[10px] ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
              Categories measured
            </div>
            <div className={`text-xl font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>
              {sosCount}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { to: '/merch/beats', label: 'Beat', icon: '🗺' },
          { to: '/merch/visit', label: 'New Visit', icon: '📋' },
          { to: '/merch/history', label: 'History', icon: '🕒' },
        ].map((a) => (
          <Link
            key={a.to}
            to={a.to}
            className={`flex flex-col items-center py-3 rounded-2xl border text-center ${card}`}
          >
            <span className="text-lg mb-1">{a.icon}</span>
            <span className={`text-[10px] font-medium ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
              {a.label}
            </span>
          </Link>
        ))}
      </div>

      <Link
        to="/merch/beats"
        className="block w-full text-center bg-teal-600 text-white font-semibold py-3.5 rounded-2xl shadow-lg shadow-teal-600/20"
      >
        Start today's beat
      </Link>

      <p className={`text-[10px] text-center ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
        Merchandisers work Monday–Saturday
      </p>
    </div>
  );
}
