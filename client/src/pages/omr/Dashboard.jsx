import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function Dashboard() {
  const { user } = useAuth();
  const { dark, toggle } = useTheme();
  const [target, setTarget] = useState(null);
  const [summary, setSummary] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [beat, setBeat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gpsError, setGpsError] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [tRes, sRes, aRes, bRes] = await Promise.all([
        api.get('/targets/me'),
        api.get('/credits/summary'),
        api.get('/attendance/today'),
        api.get('/beats/today').catch(() => ({ data: null })),
      ]);
      setTarget(tRes.data);
      setSummary(sRes.data);
      setAttendance(aRes.data);
      setBeat(bRes.data);
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

  const pct = target?.percentage || 0;
  const total = beat?.total || 0;
  const visited = beat?.visitedCount || 0;
  const notVisited = Math.max(0, total - visited);
  const coveragePct = total > 0 ? Math.round((visited / total) * 100) : 0;

  const todayLabel = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-2">
      {/* Header card */}
      <div
        className={`rounded-3xl p-5 text-white relative overflow-hidden ${
          dark ? 'bg-gradient-to-br from-indigo-900 to-violet-900' : 'bg-gradient-to-br from-indigo-600 to-violet-600'
        }`}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="flex items-start justify-between relative">
          <div>
            <p className="text-indigo-100 text-xs font-medium">Hi,</p>
            <h1 className="text-xl font-bold leading-tight">{user?.fullName}</h1>
            <p className="text-indigo-200 text-xs mt-0.5">
              OMR · {user?.territory || '—'} · {user?.distributor || '—'}
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
        <div className="mt-4 flex items-center gap-2 text-xs text-indigo-100">
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

      {/* Target progress */}
      <div className={`rounded-2xl p-4 border ${dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-sm'}`}>
        <div className="flex justify-between items-center mb-2">
          <span className={`text-sm font-semibold ${dark ? 'text-white' : 'text-slate-800'}`}>
            Monthly Target
          </span>
          <span className="text-indigo-500 font-bold text-sm">{pct}%</span>
        </div>
        {target?.hasTarget ? (
          <>
            <div className={`h-2.5 rounded-full overflow-hidden ${dark ? 'bg-slate-700' : 'bg-slate-100'}`}>
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
            <div className={`flex justify-between mt-2 text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
              <span>GHS {(target.achievedAmount || 0).toLocaleString()}</span>
              <span>of {(target.targetAmount || 0).toLocaleString()}</span>
            </div>
          </>
        ) : (
          <p className={`text-xs ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
            No target set for this month
          </p>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { to: '/omr/beats', label: 'Beat', icon: '🗺' },
          { to: '/omr/outlets', label: 'Outlets', icon: '🏪' },
          { to: '/omr/owings', label: 'Owings', icon: '💳' },
          { to: '/omr/wrap-up', label: 'Wrap-Up', icon: '📋' },
        ].map((a) => (
          <Link
            key={a.to}
            to={a.to}
            className={`flex flex-col items-center py-3 rounded-2xl border text-center ${
              dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-sm'
            }`}
          >
            <span className="text-lg mb-1">{a.icon}</span>
            <span className={`text-[10px] font-medium ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
              {a.label}
            </span>
          </Link>
        ))}
      </div>

      {/* Visit summary - circular style like reference */}
      <div className={`rounded-2xl p-4 border ${dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-sm'}`}>
        <div className="flex justify-between items-center mb-3">
          <h3 className={`text-sm font-semibold ${dark ? 'text-white' : 'text-slate-800'}`}>
            Visit Summary
          </h3>
          <span className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-400'}`}>
            {beat?.dayName || todayLabel}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Circle */}
          <div className="relative w-24 h-24 flex-shrink-0">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18" cy="18" r="15.5"
                fill="none"
                stroke={dark ? '#334155' : '#e2e8f0'}
                strokeWidth="3"
              />
              <circle
                cx="18" cy="18" r="15.5"
                fill="none"
                stroke="#6366f1"
                strokeWidth="3"
                strokeDasharray={`${coveragePct * 0.97} 100`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-xl font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>
                {total}
              </span>
              <span className={`text-[9px] ${dark ? 'text-slate-400' : 'text-slate-400'}`}>
                Outlets
              </span>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-2 gap-2">
            <div className={`rounded-xl p-2.5 ${dark ? 'bg-slate-900' : 'bg-emerald-50'}`}>
              <div className="text-lg font-bold text-emerald-500">{visited}</div>
              <div className={`text-[10px] ${dark ? 'text-slate-400' : 'text-emerald-700'}`}>
                Visited
              </div>
            </div>
            <div className={`rounded-xl p-2.5 ${dark ? 'bg-slate-900' : 'bg-red-50'}`}>
              <div className="text-lg font-bold text-red-400">{notVisited}</div>
              <div className={`text-[10px] ${dark ? 'text-slate-400' : 'text-red-600'}`}>
                Not visited
              </div>
            </div>
            <div className={`col-span-2 rounded-xl p-2.5 ${dark ? 'bg-slate-900' : 'bg-indigo-50'}`}>
              <div className={`text-[10px] ${dark ? 'text-slate-400' : 'text-indigo-600'}`}>
                Beat coverage
              </div>
              <div className="text-sm font-bold text-indigo-500">{coveragePct}%</div>
            </div>
          </div>
        </div>

        {beat?.outlets?.length > 0 && (
          <p className={`text-xs mt-3 truncate ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
            Beat: {beat.outlets.map((o) => o.name).slice(0, 3).join(', ')}
            {beat.outlets.length > 3 ? '…' : ''}
          </p>
        )}
      </div>

      {/* Sales / Received / Owings */}
      <div className="grid grid-cols-3 gap-2">
        {[
          {
            label: 'Sales',
            value: summary ? `₵${(summary.totalSales || 0).toLocaleString()}` : '—',
            color: dark ? 'text-white' : 'text-slate-800',
          },
          {
            label: 'Received',
            value: summary ? `₵${(summary.received || 0).toLocaleString()}` : '—',
            color: 'text-emerald-500',
          },
          {
            label: 'Owings',
            value: summary ? `₵${(summary.owings || 0).toLocaleString()}` : '—',
            color: 'text-amber-500',
          },
        ].map((s) => (
          <div
            key={s.label}
            className={`rounded-2xl p-3 text-center border ${
              dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-sm'
            }`}
          >
            <div className={`text-[10px] ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
              {s.label}
            </div>
            <div className={`text-sm font-bold mt-0.5 ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <Link
        to="/omr/beats"
        className="block w-full text-center bg-indigo-600 text-white font-semibold py-3.5 rounded-2xl shadow-lg shadow-indigo-600/20"
      >
        Start today's beat
      </Link>
    </div>
  );
}
