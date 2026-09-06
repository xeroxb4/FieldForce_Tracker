import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

function Ring({ pct, size = 88, color = '#6366f1', track, label, value }) {
  const r = 15.5;
  const c = 2 * Math.PI * r;
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

export default function Dashboard() {
  const { user } = useAuth();
  const { dark, toggle } = useTheme();
  const [target, setTarget] = useState(null);
  const [summary, setSummary] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [beat, setBeat] = useState(null);
  const [incentive, setIncentive] = useState(null);
  const [showTop10, setShowTop10] = useState(false);
  const [loading, setLoading] = useState(true);
  const [gpsError, setGpsError] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [tRes, sRes, aRes, bRes, iRes] = await Promise.all([
        api.get('/targets/me'),
        api.get('/credits/summary'),
        api.get('/attendance/today'),
        api.get('/beats/today').catch(() => ({ data: null })),
        api.get('/incentives/breakdown').catch(() => ({ data: null })),
      ]);
      setTarget(tRes.data);
      setSummary(sRes.data);
      setAttendance(aRes.data);
      setBeat(bRes.data);
      setIncentive(iRes.data);
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
  const total = beat?.total || incentive?.day?.beatOutlets || 0;
  const visited = beat?.visitedCount ?? incentive?.day?.outletsVisited ?? 0;
  const notVisited = Math.max(0, total - visited);
  const coveragePct = incentive?.day?.coveragePct ?? (total > 0 ? Math.round((visited / total) * 100) : 0);

  const todayLabel = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const track = dark ? '#334155' : '#e2e8f0';
  const card = dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-sm';
  const day = incentive?.day;
  const mtd = incentive?.mtd;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-2">
      {/* Header */}
      <div
        className={`rounded-3xl p-5 text-white relative overflow-hidden ${
          dark
            ? 'bg-gradient-to-br from-indigo-900 to-violet-900'
            : 'bg-gradient-to-br from-indigo-600 to-violet-600'
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

      {/* Target */}
      <div className={`rounded-2xl p-4 border ${card}`}>
        <div className="flex justify-between items-center mb-2">
          <span className={`text-sm font-semibold ${dark ? 'text-white' : 'text-slate-800'}`}>
            Monthly Target
          </span>
          <span className="text-[#2596be] font-bold text-sm">{pct}%</span>
        </div>
        {target?.hasTarget ? (
          <>
            <div className={`h-2.5 rounded-full overflow-hidden ${dark ? 'bg-slate-700' : 'bg-slate-100'}`}>
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
            <div className={`flex justify-between mt-2 text-xs ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
              <span>GHS {(target.achievedAmount || 0).toLocaleString()}</span>
              <span>of {(target.targetAmount || 0).toLocaleString()}</span>
            </div>
          </>
        ) : (
          <p className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
            No target set for this month
          </p>
        )}
      </div>

      {/* Visit Summary */}
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
          <Ring
            pct={coveragePct}
            color="#6366f1"
            track={track}
            value={total}
            label="Outlets"
          />
          <div className="flex-1 grid grid-cols-2 gap-2">
            <div className={`rounded-xl p-2.5 ${dark ? 'bg-slate-900' : 'bg-emerald-50'}`}>
              <div className="text-lg font-bold text-emerald-500">{visited}</div>
              <div className={`text-[10px] ${dark ? 'text-slate-400' : 'text-emerald-700'}`}>Visited</div>
            </div>
            <div className={`rounded-xl p-2.5 ${dark ? 'bg-slate-900' : 'bg-red-50'}`}>
              <div className="text-lg font-bold text-red-400">{notVisited}</div>
              <div className={`text-[10px] ${dark ? 'text-slate-400' : 'text-red-600'}`}>Not visited</div>
            </div>
            <div className={`col-span-2 rounded-xl p-2.5 ${dark ? 'bg-slate-900' : 'bg-indigo-50'}`}>
              <div className={`text-[10px] ${dark ? 'text-slate-400' : 'text-indigo-600'}`}>
                Coverage (target 100%)
              </div>
              <div className="text-sm font-bold text-[#2596be]">{coveragePct}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Incentive Breakdown */}
      <div className={`rounded-2xl p-4 border ${card}`}>
        <div className="flex justify-between items-center mb-3">
          <h3 className={`text-sm font-semibold ${dark ? 'text-white' : 'text-slate-800'}`}>
            Incentive Breakdown
          </h3>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${dark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-500'}`}>
            Today
          </span>
        </div>

        {/* 4 rings / metrics */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className={`rounded-xl p-3 flex items-center gap-3 ${dark ? 'bg-slate-900' : 'bg-slate-50'}`}>
            <Ring
              pct={day?.productivityPct || 0}
              size={64}
              color="#10b981"
              track={track}
              value={`${day?.productivityPct ?? 0}%`}
              label=""
            />
            <div>
              <div className={`text-xs font-semibold ${dark ? 'text-white' : 'text-slate-800'}`}>
                Productivity
              </div>
              <div className={`text-[10px] ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
                {day?.productiveCalls ?? 0} productive calls
              </div>
              <div className={`text-[10px] ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                LPPC {day?.lppc ?? 0}
              </div>
            </div>
          </div>

          <div className={`rounded-xl p-3 flex items-center gap-3 ${dark ? 'bg-slate-900' : 'bg-slate-50'}`}>
            <Ring
              pct={day?.coveragePct || 0}
              size={64}
              color={coveragePct >= 100 ? '#10b981' : '#f59e0b'}
              track={track}
              value={`${day?.coveragePct ?? 0}%`}
              label=""
            />
            <div>
              <div className={`text-xs font-semibold ${dark ? 'text-white' : 'text-slate-800'}`}>
                Coverage
              </div>
              <div className={`text-[10px] ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
                {day?.outletsVisited ?? 0}/{day?.beatOutlets ?? 0} outlets
              </div>
              <div className={`text-[10px] ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                Must be 100%
              </div>
            </div>
          </div>

          <div className={`rounded-xl p-3 flex items-center gap-3 ${dark ? 'bg-slate-900' : 'bg-slate-50'}`}>
            <Ring
              pct={day?.hitRatePct || 0}
              size={64}
              color="#8b5cf6"
              track={track}
              value={`${day?.hitRatePct ?? 0}%`}
              label=""
            />
            <div>
              <div className={`text-xs font-semibold ${dark ? 'text-white' : 'text-slate-800'}`}>
                Hit Rate
              </div>
              <div className={`text-[10px] ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
                Productive ÷ visits
              </div>
              <div className={`text-[10px] ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                {day?.productiveCalls ?? 0}/{day?.totalVisits ?? 0} calls
              </div>
            </div>
          </div>

          <div className={`rounded-xl p-3 flex items-center gap-3 ${dark ? 'bg-slate-900' : 'bg-slate-50'}`}>
            <Ring
              pct={day?.top10Pct || 0}
              size={64}
              color="#f59e0b"
              track={track}
              value={`${day?.top10HitCount ?? 0}/10`}
              label=""
            />
            <div>
              <div className={`text-xs font-semibold ${dark ? 'text-white' : 'text-slate-800'}`}>
                Top 10
              </div>
              <div className={`text-[10px] ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
                Penetration {day?.top10Pct ?? 0}%
              </div>
              <button
                type="button"
                onClick={() => setShowTop10(!showTop10)}
                className="text-[10px] text-[#2596be] font-medium"
              >
                {showTop10 ? 'Hide list' : 'View list'}
              </button>
            </div>
          </div>
        </div>

        {showTop10 && day?.top10Detail && (
          <div className={`rounded-xl p-3 mb-3 space-y-1 ${dark ? 'bg-slate-900' : 'bg-slate-50'}`}>
            {day.top10Detail.map((p, i) => (
              <div key={i} className="flex items-center justify-between text-[11px]">
                <span className={dark ? 'text-slate-300' : 'text-slate-600'}>{p.name}</span>
                <span className={p.sold ? 'text-emerald-500 font-medium' : 'text-slate-400'}>
                  {p.sold ? '✓ Sold' : '—'}
                </span>
              </div>
            ))}
          </div>
        )}

        <p className={`text-[10px] leading-relaxed ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
          Productive call = outlet buys ≥1 piece of any SKU. Coverage = visit every beat outlet.
          LPPC = product lines ÷ productive calls.
        </p>

        {/* MTD strip */}
        {mtd && (
          <div className={`mt-3 pt-3 border-t grid grid-cols-4 gap-1 text-center ${dark ? 'border-slate-700' : 'border-slate-100'}`}>
            <div>
              <div className={`text-[9px] ${dark ? 'text-slate-400' : 'text-slate-500'}`}>MTD Hit</div>
              <div className="text-xs font-bold text-violet-500">{mtd.hitRatePct}%</div>
            </div>
            <div>
              <div className={`text-[9px] ${dark ? 'text-slate-400' : 'text-slate-500'}`}>MTD LPPC</div>
              <div className="text-xs font-bold text-emerald-500">{mtd.lppc}</div>
            </div>
            <div>
              <div className={`text-[9px] ${dark ? 'text-slate-400' : 'text-slate-500'}`}>MTD Prod</div>
              <div className="text-xs font-bold text-[#2596be]">{mtd.productiveCalls}</div>
            </div>
            <div>
              <div className={`text-[9px] ${dark ? 'text-slate-400' : 'text-slate-500'}`}>MTD Top10</div>
              <div className="text-xs font-bold text-amber-500">{mtd.top10HitCount}/10</div>
            </div>
          </div>
        )}
      </div>

      {/* Sales cards */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Sales', value: summary ? `₵${(summary.totalSales || 0).toLocaleString()}` : '—', color: dark ? 'text-white' : 'text-slate-800' },
          { label: 'Received', value: summary ? `₵${(summary.received || 0).toLocaleString()}` : '—', color: 'text-emerald-500' },
          { label: 'Owings', value: summary ? `₵${(summary.owings || 0).toLocaleString()}` : '—', color: 'text-amber-500' },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl p-3 text-center border ${card}`}>
            <div className={`text-[10px] ${dark ? 'text-slate-400' : 'text-slate-600'}`}>{s.label}</div>
            <div className={`text-sm font-bold mt-0.5 ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

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
        to="/omr/beats"
        className="block w-full text-center bg-[#2596be] text-white font-semibold py-3.5 rounded-2xl shadow-lg shadow-indigo-600/20"
      >
        Start today's beat
      </Link>
    </div>
  );
}
