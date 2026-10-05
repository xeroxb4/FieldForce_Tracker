import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const MOTIVATIONS = [
  "Every shop you walk into is a chance to grow today's total. Make it count.",
  "Small orders stack up. Consistency beats one lucky day.",
  "Your target does not move itself — your next productive call does.",
  "Coverage first, then conversion. Visit every beat outlet today.",
  "Champions check in, hit the beat, and close clean.",
  "One more SKU on the invoice can lift your LPPC. Ask for the line.",
  "Debt collection is part of the win. Clear what is due, then sell.",
  "Your name on the leaderboard is written one outlet at a time.",
  "Smile, open the catalog, and leave with a yes — or a clear next step.",
  "Progress is monthly. Push today's sales into the month total.",
  "Top 10 lines pay. Offer Cocoa, Perfect & Radiant, Dry Impact.",
  "Be on time at the first shop. Momentum follows discipline.",
  "No order still counts as coverage — log it and move to the next.",
  "You already know the route. Today, execute it better than yesterday.",
  "Imperial ships product. You turn product into shelf and sales.",
  "Protect your AVC shops — they are long-term partners.",
  "When the market is slow, your hustle is the difference.",
  "End the day with wrap-up done. Clean data, clear mind.",
  "Targets are promises to yourself. Keep today's promise.",
  "Great reps do not wait for perfect conditions — they create results.",
  "Call the decision maker. The owner opens the bigger order.",
  "Carton talk when the shelf is empty. Pack talk when cash is tight.",
  "Your distributor backs you. Show them volume and reliability.",
  "Beat day is sacred. Finish today's list before tomorrow's.",
  "A thank-you and a reorder date close the relationship.",
  "Measure yourself by productive calls, not hours on the road.",
  "If GPS is on and you are at the door, you are already winning.",
  "Sell the solution: freshness, beauty, confidence — then the SKU.",
  "Month-to-date is the real scoreboard. Add to it before sunset.",
  "Hard work is quiet. Results are loud. Keep going.",
  "You carry Nivea into the market. Carry pride with it.",
];

function motivationForToday() {
  const d = new Date();
  const key = d.getFullYear() * 1000 + d.getMonth() * 50 + d.getDate();
  return MOTIVATIONS[key % MOTIVATIONS.length];
}

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


function OmrFab({ dark }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(() => {
    try {
      const s = localStorage.getItem('omrFabPos');
      if (s) return JSON.parse(s);
    } catch {}
    return { x: null, y: null };
  });
  const dragging = useRef(false);
  const moved = useRef(false);
  const startPt = useRef({ x: 0, y: 0, px: 0, py: 0 });

  // Arc upward-left like the reference (angles from main button center)
  const items = [
    { to: '/omr/softphone', label: 'Call', icon: '📞', color: '#22c55e', angle: -20 },
    { to: '/omr/outlets', label: 'Outlet', icon: '🏪', color: '#f59e0b', angle: -70 },
    { to: '/omr/reports', label: 'Report', icon: '📊', color: '#a855f7', angle: -120 },
  ];

  const onPointerDown = (e) => {
    e.preventDefault();
    dragging.current = true;
    moved.current = false;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = pos.x != null ? pos.x : rect.left;
    const cy = pos.y != null ? pos.y : rect.top;
    startPt.current = { x: e.clientX, y: e.clientY, px: cx, py: cy };
  };

  const onPointerMove = (e) => {
    if (!dragging.current) return;
    const dx = e.clientX - startPt.current.x;
    const dy = e.clientY - startPt.current.y;
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) moved.current = true;
    if (!moved.current) return;
    const maxX = window.innerWidth - 64;
    const maxY = window.innerHeight - 64;
    setPos({
      x: Math.min(maxX, Math.max(8, startPt.current.px + dx)),
      y: Math.min(maxY, Math.max(8, startPt.current.py + dy)),
    });
  };

  const onPointerUp = () => {
    if (!dragging.current) return;
    dragging.current = false;
    if (moved.current) {
      setPos((p) => {
        try {
          localStorage.setItem('omrFabPos', JSON.stringify(p));
        } catch {}
        return p;
      });
      setOpen(false);
    } else {
      setOpen((o) => !o);
    }
  };

  const wrapStyle =
    pos.x != null && pos.y != null
      ? { left: pos.x, top: pos.y, right: 'auto', bottom: 'auto' }
      : { right: 16, bottom: 96 };

  const radius = 78;
  const mainSize = 58;

  return (
    <div className="fixed z-40" style={{ ...wrapStyle, width: mainSize, height: mainSize }}>
      {/* Soft circular backdrop when open */}
      <div
        className="absolute pointer-events-none transition-all duration-300 ease-out"
        style={{
          left: '50%',
          top: '50%',
          width: open ? radius * 2.4 : 0,
          height: open ? radius * 2.4 : 0,
          marginLeft: open ? -radius * 1.2 : 0,
          marginTop: open ? -radius * 1.2 : 0,
          borderRadius: '50%',
          background: dark
            ? 'radial-gradient(circle, rgba(63,37,139,0.35) 0%, rgba(15,23,42,0) 70%)'
            : 'radial-gradient(circle, rgba(63,37,139,0.18) 0%, rgba(255,255,255,0) 70%)',
          opacity: open ? 1 : 0,
        }}
      />

      {/* Arc track */}
      <div
        className="absolute pointer-events-none transition-opacity duration-300"
        style={{
          left: '50%',
          top: '50%',
          width: radius * 2,
          height: radius * 2,
          marginLeft: -radius,
          marginTop: -radius,
          borderRadius: '50%',
          border: open ? '2px solid rgba(34,197,94,0.25)' : '2px solid transparent',
          opacity: open ? 1 : 0,
        }}
      />

      {/* Satellite actions */}
      {items.map((item, i) => {
        const rad = (item.angle * Math.PI) / 180;
        const tx = Math.cos(rad) * radius;
        const ty = Math.sin(rad) * radius;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => setOpen(false)}
            className="absolute flex flex-col items-center justify-center rounded-full text-white shadow-lg"
            style={{
              width: 46,
              height: 46,
              left: '50%',
              top: '50%',
              background: item.color,
              boxShadow: open ? `0 8px 20px ${item.color}66` : 'none',
              transform: open
                ? `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(1)`
                : 'translate(-50%, -50%) scale(0.2)',
              opacity: open ? 1 : 0,
              pointerEvents: open ? 'auto' : 'none',
              transition: `transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 0.05}s, opacity 0.25s ease ${i * 0.05}s`,
              zIndex: 1,
            }}
            title={item.label}
          >
            <span className="text-base leading-none">{item.icon}</span>
          </Link>
        );
      })}

      {/* Labels when open */}
      {open &&
        items.map((item) => {
          const rad = (item.angle * Math.PI) / 180;
          const tx = Math.cos(rad) * (radius + 28);
          const ty = Math.sin(rad) * (radius + 28);
          return (
            <span
              key={`lbl-${item.to}`}
              className="absolute text-[10px] font-bold whitespace-nowrap pointer-events-none"
              style={{
                left: '50%',
                top: '50%',
                transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px))`,
                color: dark ? '#e2e8f0' : '#1e293b',
                textShadow: dark ? '0 1px 2px #000' : '0 1px 0 #fff',
              }}
            >
              {item.label}
            </span>
          );
        })}

      {/* Main FAB — green like reference */}
      <button
        type="button"
        aria-label="Quick actions"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="absolute left-0 top-0 rounded-full flex items-center justify-center text-white touch-none select-none"
        style={{
          width: mainSize,
          height: mainSize,
          background: open
            ? 'linear-gradient(145deg, #4ade80, #16a34a)'
            : 'linear-gradient(145deg, #4ade80, #15803d)',
          boxShadow: open
            ? '0 10px 28px rgba(22,163,74,0.55)'
            : '0 8px 24px rgba(22,163,74,0.45)',
          transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          zIndex: 2,
          fontSize: 28,
          fontWeight: 300,
          lineHeight: 1,
        }}
      >
        {open ? '×' : '+'}
      </button>
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
  const [monthSum, setMonthSum] = useState(null);
  const [showTop10, setShowTop10] = useState(false);
  const [loading, setLoading] = useState(true);
  const [gpsError, setGpsError] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [tRes, sRes, aRes, bRes, iRes, mRes] = await Promise.all([
        api.get('/targets/me'),
        api.get('/credits/summary'),
        api.get('/attendance/today'),
        api.get('/beats/today').catch(() => ({ data: null })),
        api.get('/incentives/breakdown').catch(() => ({ data: null })),
        api.get('/omr/month-summary').catch(() => ({ data: null })),
      ]);
      setTarget(tRes.data);
      setSummary(sRes.data);
      setAttendance(aRes.data);
      setBeat(bRes.data);
      setIncentive(iRes.data);
      setMonthSum(mRes?.data || null);
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


  const handleCheckOut = () => {
    setGpsError('');
    setCheckingOut(true);
    if (!navigator.geolocation) {
      setGpsError('GPS not supported on this device');
      setCheckingOut(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await api.post('/attendance/check-out', {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
          await load();
        } catch (err) {
          setGpsError(err.response?.data?.message || 'Failed to check out');
        } finally {
          setCheckingOut(false);
        }
      },
      () => {
        setGpsError('Location is off. Turn on GPS to check out.');
        setCheckingOut(false);
      },
      { enableHighAccuracy: true, timeout: 20000 }
    );
  };

  const pct = target?.percentage || 0;
  const day = incentive?.day;
  const mtd = incentive?.mtd;
  const total = beat?.total || day?.beatOutlets || 0;
  const visited = beat?.visitedCount ?? day?.outletsVisited ?? 0;
  const notVisited = Math.max(0, total - visited);
  const coveragePct = day?.coveragePct ?? (total > 0 ? Math.round((visited / total) * 100) : 0);
  const productiveCalls = day?.productiveCalls ?? 0;
  const totalVisitsToday = day?.totalVisits ?? visited;
  const visitConversionPct =
    day?.visitConversionPct ??
    (totalVisitsToday > 0
      ? Math.round((productiveCalls / totalVisitsToday) * 1000) / 10
      : 0);

  const todayLabel = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const track = dark ? '#334155' : '#e2e8f0';
  const card = dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-sm';

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
          {!attendance?.checkedIn ? (
            <button
              type="button"
              onClick={handleCheckIn}
              disabled={checkingIn}
              className="bg-amber-400 text-amber-950 font-semibold px-2.5 py-1 rounded-lg disabled:opacity-60"
            >
              {checkingIn ? 'GPS...' : 'Check in'}
            </button>
          ) : attendance?.checkedOut ? (
            <span className="bg-slate-500/40 text-white px-2.5 py-1 rounded-lg text-xs">
              ✓ Day closed
            </span>
          ) : (
            <button
              type="button"
              onClick={handleCheckOut}
              disabled={checkingOut}
              className="bg-emerald-400 text-emerald-950 font-semibold px-2.5 py-1 rounded-lg disabled:opacity-60"
            >
              {checkingOut ? 'GPS...' : 'Check out'}
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

      {/* Motivation */}
      <div className={`rounded-2xl p-4 border ${card} border-l-4 border-l-amber-400`}>
        <div className={`text-[10px] font-bold uppercase tracking-wide ${dark ? 'text-amber-300' : 'text-amber-700'}`}>
          Today&apos;s push
        </div>
        <p className={`text-sm mt-1 font-medium leading-snug ${dark ? 'text-white' : 'text-slate-800'}`}>
          {motivationForToday()}
        </p>
      </div>

      {/* Monthly summary */}
      <div className={`rounded-2xl p-4 border ${card}`}>
        <div className="flex justify-between items-center mb-3">
          <h3 className={`text-sm font-semibold ${dark ? 'text-white' : 'text-slate-800'}`}>
            Monthly summary
          </h3>
          <span className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
            {monthSum?.monthStart || ''} → today
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className={`rounded-xl p-2.5 ${dark ? 'bg-slate-900' : 'bg-sky-50'}`}>
            <div className="text-lg font-bold text-[#2596be]">
              GHS {Number(monthSum?.totalSales || 0).toLocaleString()}
            </div>
            <div className={`text-[10px] ${dark ? 'text-slate-400' : 'text-sky-800'}`}>Sales MTD</div>
          </div>
          <div className={`rounded-xl p-2.5 ${dark ? 'bg-slate-900' : 'bg-violet-50'}`}>
            <div className="text-lg font-bold text-violet-500">{monthSum?.orders || 0}</div>
            <div className={`text-[10px] ${dark ? 'text-slate-400' : 'text-violet-800'}`}>Orders MTD</div>
          </div>
          <div className={`rounded-xl p-2.5 ${dark ? 'bg-slate-900' : 'bg-emerald-50'}`}>
            <div className="text-lg font-bold text-emerald-500">{monthSum?.productiveCalls || 0}</div>
            <div className={`text-[10px] ${dark ? 'text-slate-400' : 'text-emerald-800'}`}>Productive calls</div>
          </div>
          <div className={`rounded-xl p-2.5 ${dark ? 'bg-slate-900' : 'bg-amber-50'}`}>
            <div className="text-lg font-bold text-amber-500">{monthSum?.totalVisits || 0}</div>
            <div className={`text-[10px] ${dark ? 'text-slate-400' : 'text-amber-800'}`}>Visits MTD</div>
          </div>
        </div>
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
            <div className={`rounded-xl p-2.5 ${dark ? 'bg-slate-900' : 'bg-teal-50'}`}>
              <div className="text-lg font-bold text-teal-600">
                {productiveCalls}
              </div>
              <div className={`text-[10px] ${dark ? 'text-slate-400' : 'text-teal-700'}`}>
                Productive
              </div>
              <div className={`text-[9px] ${dark ? 'text-slate-500' : 'text-teal-600/80'}`}>
                of {totalVisitsToday} visits
              </div>
            </div>
            <div className={`rounded-xl p-2.5 ${dark ? 'bg-slate-900' : 'bg-indigo-50'}`}>
              <div className={`text-[10px] ${dark ? 'text-slate-400' : 'text-indigo-600'}`}>
                Coverage
              </div>
              <div className="text-sm font-bold text-[#2596be]">{coveragePct}%</div>
              <div className={`text-[9px] ${dark ? 'text-slate-500' : 'text-indigo-500'}`}>
                target 100%
              </div>
            </div>
            <div className={`rounded-xl p-2.5 col-span-2 ${dark ? 'bg-slate-900' : 'bg-violet-50'}`}>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className={`text-[10px] font-semibold ${dark ? 'text-slate-300' : 'text-violet-800'}`}>
                    Visit conversion
                  </div>
                  <div className={`text-[9px] ${dark ? 'text-slate-500' : 'text-violet-600'}`}>
                    Productive ÷ visits done
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-violet-600">{visitConversionPct}%</div>
                  <div className={`text-[9px] ${dark ? 'text-slate-500' : 'text-violet-600'}`}>
                    {productiveCalls} ÷ {totalVisitsToday}
                  </div>
                </div>
              </div>
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
                {day?.productiveCalls ?? 0} / {day?.productivityTarget ?? '—'} target
              </div>
              <div className={`text-[10px] ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                70% of beat · LPPC {day?.lppc ?? 0}
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
                Productive ÷ planned
              </div>
              <div className={`text-[10px] ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                {day?.productiveCalls ?? 0}/{day?.beatOutlets ?? 0} outlets
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

        <div className={`mt-2 grid grid-cols-2 gap-2 text-center text-[11px] ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
          <div className={`rounded-xl border px-2 py-1.5 ${dark ? 'border-slate-700' : 'border-slate-200'}`}>
            <div className={`text-[9px] ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Top 10 sum</div>
            <div className="font-bold text-amber-500">{day?.top10LineTotal ?? 0}</div>
            <div className={`text-[9px] ${dark ? 'text-slate-500' : 'text-slate-400'}`}>7+4+8 style total</div>
          </div>
          <div className={`rounded-xl border px-2 py-1.5 ${dark ? 'border-slate-700' : 'border-slate-200'}`}>
            <div className={`text-[9px] ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Top 10 avg</div>
            <div className="font-bold text-amber-500">{day?.top10LineAvg ?? 0}</div>
            <div className={`text-[9px] ${dark ? 'text-slate-500' : 'text-slate-400'}`}>per productive call</div>
          </div>
        </div>
        <p className={`text-[10px] leading-relaxed mt-2 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
          Productive call = outlet buys ≥1 SKU. Coverage = visits ÷ planned beat.
          Hit rate = productive ÷ planned. Productivity % = productive ÷ (70% of planned).
          LPPC = lines ÷ productive calls. Top 10 % = unique /10; sum = lines across shops; avg = sum ÷ productive.
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
        {mtd && (
          <div className={`mt-1 grid grid-cols-2 gap-1 text-center text-[10px] ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
            <div>MTD Top10 sum <span className="font-bold text-amber-500">{mtd.top10LineTotal ?? 0}</span></div>
            <div>MTD Top10 avg <span className="font-bold text-amber-500">{mtd.top10LineAvg ?? 0}</span></div>
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

      {/* Floating action button — circular menu */}
      <OmrFab dark={dark} />

    </div>
  );
}
