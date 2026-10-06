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
  // Fill 0–100% only (values over 100 still show full ring)
  const fill = Math.min(100, Math.max(0, Number(pct) || 0));
  const dash = (fill / 100) * c;
  const valStr = String(value ?? '');
  const longVal = valStr.length >= 5; // e.g. 14.3% or 100%
  const fontSize = size <= 64 ? (longVal ? 11 : 13) : longVal ? 14 : 16;
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
          strokeDasharray={`${dash} ${c}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-0.5 text-center">
        <span
          className="font-bold leading-tight tabular-nums"
          style={{ color, fontSize }}
        >
          {value}
        </span>
        {label ? (
          <span className="text-[8px] opacity-60 mt-0.5 leading-none">{label}</span>
        ) : null}
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
  const [spin, setSpin] = useState(0);
  const spinRef = useRef(0);
  const dragging = useRef(false);
  const rotating = useRef(false);
  const moved = useRef(false);
  const startPt = useRef({ x: 0, y: 0, px: 0, py: 0 });
  const lastAngle = useRef(null);
  const wrapRef = useRef(null);
  const rafRef = useRef(null);
  const scrollLocked = useRef(false);
  const savedOverflow = useRef('');

  const lockScroll = () => {
    if (scrollLocked.current) return;
    scrollLocked.current = true;
    savedOverflow.current = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
  };

  const unlockScroll = () => {
    if (!scrollLocked.current) return;
    scrollLocked.current = false;
    document.body.style.overflow = savedOverflow.current || '';
    document.documentElement.style.overflow = '';
  };

  useEffect(() => () => unlockScroll(), []);

  const baseItems = [
    { to: '/omr/softphone', label: 'Call', icon: '📞', color: '#22c55e' },
    { to: '/omr/outlets', label: 'Outlet', icon: '🏪', color: '#f59e0b' },
    { to: '/omr/reports', label: 'Report', icon: '📊', color: '#a855f7' },
  ];
  // Full 360° — evenly spaced
  const baseAngles = [0, 120, 240];

  const centerOfFab = () => {
    const el = wrapRef.current;
    if (!el) return { cx: 0, cy: 0 };
    const r = el.getBoundingClientRect();
    return { cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
  };

  const angleFromEvent = (e) => {
    const { cx, cy } = centerOfFab();
    return (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI;
  };

  const applySpin = (next) => {
    spinRef.current = next;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => setSpin(spinRef.current));
  };

  const onPointerDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    lockScroll();
    const { cx, cy } = centerOfFab();
    const dist = Math.hypot(e.clientX - cx, e.clientY - cy);

    if (open && dist > 26) {
      rotating.current = true;
      dragging.current = false;
      lastAngle.current = angleFromEvent(e);
      return;
    }

    rotating.current = false;
    dragging.current = true;
    moved.current = false;
    const rect = e.currentTarget.getBoundingClientRect();
    startPt.current = {
      x: e.clientX,
      y: e.clientY,
      px: pos.x != null ? pos.x : rect.left,
      py: pos.y != null ? pos.y : rect.top,
    };
  };

  const onPointerMove = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (rotating.current && open) {
      const a = angleFromEvent(e);
      if (lastAngle.current != null) {
        let delta = a - lastAngle.current;
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;
        applySpin(spinRef.current + delta);
      }
      lastAngle.current = a;
      return;
    }
    if (!dragging.current) return;
    const dx = e.clientX - startPt.current.x;
    const dy = e.clientY - startPt.current.y;
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) moved.current = true;
    if (!moved.current) return;
    setPos({
      x: Math.min(window.innerWidth - 64, Math.max(8, startPt.current.px + dx)),
      y: Math.min(window.innerHeight - 64, Math.max(8, startPt.current.py + dy)),
    });
  };

  const onPointerUp = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    unlockScroll();
    if (rotating.current) {
      rotating.current = false;
      lastAngle.current = null;
      return;
    }
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

  const radius = 88;
  const mainSize = 58;

  return (
    <div
      ref={wrapRef}
      className="fixed z-40 touch-none select-none"
      style={{
        ...wrapStyle,
        width: mainSize,
        height: mainSize,
        touchAction: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onTouchStart={(e) => {
        e.preventDefault();
        lockScroll();
      }}
      onTouchMove={(e) => e.preventDefault()}
      onTouchEnd={() => unlockScroll()}
    >
      <div
        className="absolute pointer-events-none transition-all duration-300 ease-out"
        style={{
          left: '50%',
          top: '50%',
          width: open ? radius * 2.5 : 0,
          height: open ? radius * 2.5 : 0,
          marginLeft: open ? -radius * 1.25 : 0,
          marginTop: open ? -radius * 1.25 : 0,
          borderRadius: '50%',
          background: dark
            ? 'radial-gradient(circle, rgba(63,37,139,0.35) 0%, rgba(15,23,42,0) 70%)'
            : 'radial-gradient(circle, rgba(63,37,139,0.2) 0%, rgba(255,255,255,0) 70%)',
          opacity: open ? 1 : 0,
        }}
      />

      {/* Full 360° ring guide */}
      <div
        className="absolute pointer-events-none rounded-full border-2 border-dashed transition-opacity duration-300"
        style={{
          left: '50%',
          top: '50%',
          width: radius * 2,
          height: radius * 2,
          marginLeft: -radius,
          marginTop: -radius,
          borderColor: dark ? 'rgba(167,139,250,0.4)' : 'rgba(109,40,217,0.35)',
          opacity: open ? 1 : 0,
          transform: `rotate(${spin}deg)`,
        }}
      />

      {baseItems.map((item, i) => {
        const angle = baseAngles[i] + spin;
        const rad = (angle * Math.PI) / 180;
        const tx = Math.cos(rad) * radius;
        const ty = Math.sin(rad) * radius;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={(e) => {
              if (moved.current) {
                e.preventDefault();
                return;
              }
              setOpen(false);
            }}
            className="absolute flex items-center justify-center rounded-full text-white shadow-lg"
            style={{
              width: 48,
              height: 48,
              left: '50%',
              top: '50%',
              background: item.color,
              boxShadow: open ? `0 8px 20px ${item.color}55` : 'none',
              transform: open
                ? `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(1)`
                : 'translate(-50%, -50%) scale(0.12)',
              opacity: open ? 1 : 0,
              pointerEvents: open ? 'auto' : 'none',
              transition: rotating.current
                ? 'none'
                : `transform 0.45s cubic-bezier(0.22, 1, 0.36, 1) ${i * 0.05}s, opacity 0.3s ease ${i * 0.05}s`,
              zIndex: 1,
              willChange: 'transform',
            }}
            title={item.label}
          >
            <span className="text-base leading-none">{item.icon}</span>
          </Link>
        );
      })}

      {open &&
        baseItems.map((item, i) => {
          const angle = baseAngles[i] + spin;
          const rad = (angle * Math.PI) / 180;
          const tx = Math.cos(rad) * (radius + 32);
          const ty = Math.sin(rad) * (radius + 32);
          return (
            <span
              key={`lbl-${item.to}`}
              className="absolute text-[10px] font-bold whitespace-nowrap pointer-events-none"
              style={{
                left: '50%',
                top: '50%',
                transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px))`,
                color: dark ? '#e2e8f0' : '#1e293b',
              }}
            >
              {item.label}
            </span>
          );
        })}

      <button
        type="button"
        aria-label="Quick actions"
        className="absolute left-0 top-0 rounded-full flex items-center justify-center text-white touch-none select-none"
        style={{
          width: mainSize,
          height: mainSize,
          background: 'linear-gradient(145deg, #5b3aad, #3F258B)',
          boxShadow: '0 8px 28px rgba(63,37,139,0.55)',
          transform: open ? 'rotate(135deg)' : 'rotate(0deg)',
          transition: 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
          zIndex: 2,
          fontSize: 28,
          fontWeight: 300,
          lineHeight: 1,
          touchAction: 'none',
        }}
      >
        +
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
  const card = dark
    ? 'relative overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-gradient-to-br from-white/[0.07] via-white/[0.03] to-transparent backdrop-blur-3xl'
    : 'bg-gradient-to-b from-white to-slate-50 border border-slate-200/80';
  const card3dStyle = dark
    ? {
        boxShadow:
          '0 32px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)',
      }
    : {
        boxShadow:
          '0 1.5px 0 0 rgba(255,255,255,1) inset, 0 -1.5px 3px 0 rgba(15,23,42,0.05) inset, 0 4px 8px -2px rgba(15,23,42,0.08), 0 16px 36px -8px rgba(15,23,42,0.14), 0 28px 56px -16px rgba(63,37,139,0.08)',
      };

  // Brand blend — LIGHT MODE ONLY. Dark keeps classic slate tiles.
  const C = {
    deep: '#2E1732',
    mag: '#AC60A4',
    cyan: '#28B8F0',
    purp: '#AB6BF0',
  };
  const darkTile = {
    background: 'linear-gradient(145deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%)',
    border: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '0 16px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
  };
  const tileBg = (accent) =>
    dark
      ? darkTile
      : {
          background: `linear-gradient(145deg, #ffffff 0%, ${accent}12 100%)`,
          border: `1px solid ${accent}28`,
          boxShadow: `0 1px 0 0 rgba(255,255,255,1) inset, 0 2px 6px rgba(15,23,42,0.04)`,
        };
  /** Light standout tiles — soft, low glow */
  const tileHot = (accent) =>
    dark
      ? darkTile
      : {
          background: `linear-gradient(145deg, #ffffff 0%, ${accent}16 100%)`,
          border: `1px solid ${accent}35`,
          boxShadow: `0 1px 0 0 rgba(255,255,255,1) inset, 0 3px 10px rgba(15,23,42,0.06)`,
        };
  // Ring / text colors: blend in light, classic in dark
  const ringProd = dark ? '#10b981' : C.cyan;
  const ringCov = dark ? (coveragePct >= 100 ? '#10b981' : '#f59e0b') : C.mag;
  const ringHit = dark ? '#8b5cf6' : C.purp;
  const ringTop = dark ? '#f59e0b' : C.cyan;
  const ringVisit = dark ? '#6366f1' : C.purp;
  // Light-mode standout accents (user asked to change these three)
  const lightSum = C.deep;      // Top 10 sum
  const lightAvg = C.purp;      // Top 10 avg / MTD Top 10 avg
  const lightConv = C.cyan;     // Visit conversion


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
        className="rounded-[1.75rem] p-5 text-white relative overflow-hidden"
        style={{
          background: dark
            ? 'linear-gradient(145deg, #0f0a1e 0%, #1a0f3a 35%, #3F258B 70%, #5b3aad 100%)'
            : 'linear-gradient(145deg, #4f46e5 0%, #7c3aed 55%, #6d28d9 100%)',
          boxShadow: dark
            ? '0 32px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)'
            : '0 20px 48px rgba(79,70,229,0.28)',
        }}
      >
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-fuchsia-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-8 bottom-0 h-28 w-28 rounded-full bg-cyan-300/15 blur-2xl" />
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
      <div className={`rounded-2xl p-4 border ${card}`} style={card3dStyle}>
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
      <div className={`rounded-2xl p-4 border ${card} border-l-4 border-l-amber-400`} style={card3dStyle}>
        <div className={`text-[10px] font-bold uppercase tracking-wide ${dark ? 'text-amber-300' : 'text-amber-700'}`}>
          Today&apos;s push
        </div>
        <p className={`text-sm mt-1 font-medium leading-snug ${dark ? 'text-white' : 'text-slate-800'}`}>
          {motivationForToday()}
        </p>
      </div>

      {/* Monthly summary */}
      <div className={`rounded-2xl p-4 border ${card}`} style={card3dStyle}>
        <div className="flex justify-between items-center mb-3">
          <h3 className={`text-sm font-semibold ${dark ? 'text-white' : 'text-slate-800'}`}>
            Monthly summary
          </h3>
          <span className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
            {monthSum?.monthStart || ''} → today
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl p-3" style={tileBg(C.cyan)}>
            <div className={`text-lg font-black ${dark ? 'text-[#2596be]' : ''}`} style={dark ? undefined : { color: C.cyan }}>
              GHS {Number(monthSum?.totalSales || 0).toLocaleString()}
            </div>
            <div className={`text-[10px] font-bold uppercase tracking-wide ${dark ? 'text-slate-400' : 'text-slate-600'}`}>Sales MTD</div>
          </div>
          <div className="rounded-2xl p-3" style={tileBg(C.purp)}>
            <div className={`text-lg font-black ${dark ? 'text-violet-500' : ''}`} style={dark ? undefined : { color: C.purp }}>{monthSum?.orders || 0}</div>
            <div className={`text-[10px] font-bold uppercase tracking-wide ${dark ? 'text-slate-400' : 'text-slate-600'}`}>Orders MTD</div>
          </div>
          <div className="rounded-2xl p-3" style={tileBg(C.mag)}>
            <div className={`text-lg font-black ${dark ? 'text-emerald-500' : ''}`} style={dark ? undefined : { color: C.mag }}>{monthSum?.productiveCalls || 0}</div>
            <div className={`text-[10px] font-bold uppercase tracking-wide ${dark ? 'text-slate-400' : 'text-slate-600'}`}>Productive calls</div>
          </div>
          <div className="rounded-2xl p-3" style={tileBg(C.deep)}>
            <div className={`text-lg font-black ${dark ? 'text-amber-500' : ''}`} style={dark ? undefined : { color: C.deep }}>{monthSum?.totalVisits || 0}</div>
            <div className={`text-[10px] font-bold uppercase tracking-wide ${dark ? 'text-slate-400' : 'text-slate-600'}`}>Visits MTD</div>
          </div>
        </div>
      </div>

      {/* Visit Summary */}
      <div className={`rounded-2xl p-4 border ${card}`} style={card3dStyle}>
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
            color={ringVisit}
            track={track}
            value={total}
            label="Outlets"
          />
          <div className="flex-1 grid grid-cols-2 gap-2">
            <div className="rounded-2xl p-2.5" style={tileBg(C.cyan)}>
              <div className={`text-lg font-black ${dark ? 'text-emerald-500' : ''}`} style={dark ? undefined : { color: C.cyan }}>{visited}</div>
              <div className={`text-[10px] font-bold ${dark ? 'text-slate-400' : 'text-slate-600'}`}>Visited</div>
            </div>
            <div className="rounded-2xl p-2.5" style={tileBg(C.deep)}>
              <div className={`text-lg font-black ${dark ? 'text-red-400' : ''}`} style={dark ? undefined : { color: C.deep }}>{notVisited}</div>
              <div className={`text-[10px] font-bold ${dark ? 'text-slate-400' : 'text-slate-600'}`}>Not visited</div>
            </div>
            <div className="rounded-2xl p-2.5" style={tileBg(C.mag)}>
              <div className={`text-lg font-black ${dark ? 'text-teal-500' : ''}`} style={dark ? undefined : { color: C.mag }}>{productiveCalls}</div>
              <div className={`text-[10px] font-bold ${dark ? 'text-slate-400' : 'text-slate-600'}`}>Productive</div>
              <div className={`text-[9px] ${dark ? 'text-slate-500' : 'text-slate-500'}`}>of {totalVisitsToday} visits</div>
            </div>
            <div className="rounded-2xl p-2.5" style={tileBg(C.purp)}>
              <div className={`text-[10px] font-bold ${dark ? 'text-slate-400' : 'text-slate-600'}`}>Coverage</div>
              <div className={`text-sm font-black ${dark ? 'text-[#2596be]' : ''}`} style={dark ? undefined : { color: C.purp }}>{coveragePct}%</div>
              <div className={`text-[9px] ${dark ? 'text-slate-500' : 'text-slate-500'}`}>target 100%</div>
            </div>
            <div
              className={`rounded-2xl p-3 col-span-2 ${dark ? 'bg-slate-900' : ''}`}
              style={dark ? undefined : tileHot(lightConv)}
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className={`text-[10px] font-black uppercase tracking-wide ${dark ? 'text-slate-300' : 'text-slate-800'}`}>
                    Visit conversion
                  </div>
                  <div className={`text-[9px] ${dark ? 'text-slate-500' : 'text-slate-500'}`}>
                    Productive ÷ visits done
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`text-xl font-black ${dark ? 'text-violet-500' : ''}`}
                    style={dark ? undefined : { color: lightConv }}
                  >
                    {visitConversionPct}%
                  </div>
                  <div className={`text-[9px] font-semibold ${dark ? 'text-slate-500' : 'text-slate-500'}`}>
                    {productiveCalls} ÷ {totalVisitsToday}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Incentive Breakdown */}
      <div className={`rounded-2xl p-4 border ${card}`} style={card3dStyle}>
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
          <div className="rounded-2xl p-3 flex items-center gap-2.5 min-w-0" style={tileBg(C.cyan)}>
            <Ring
              pct={Math.min(100, Number(day?.productivityPct) || 0)}
              size={64}
              color={ringProd}
              track={track}
              value={`${day?.productivityPct ?? 0}%`}
              label=""
            />
            <div className="min-w-0 flex-1">
              <div className={`text-xs font-black ${dark ? 'text-white' : 'text-slate-900'}`}>
                Productivity
              </div>
              <div className={`text-[10px] leading-snug font-semibold ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
                {day?.productiveCalls ?? 0}/{day?.productivityTarget ?? '—'} target
              </div>
              <div className={`text-[10px] leading-snug ${dark ? 'text-slate-500' : 'text-slate-500'}`}>
                70% of beat
              </div>
              <div className="text-[10px] font-bold" style={{ color: dark ? undefined : C.cyan }}>
                LPPC {day?.lppc ?? 0}
              </div>
            </div>
          </div>

          <div className="rounded-2xl p-3 flex items-center gap-3" style={tileBg(C.mag)}>
            <Ring
              pct={day?.coveragePct || 0}
              size={64}
              color={ringCov}
              track={track}
              value={`${day?.coveragePct ?? 0}%`}
              label=""
            />
            <div>
              <div className={`text-xs font-black ${dark ? 'text-white' : 'text-slate-900'}`}>
                Coverage
              </div>
              <div className={`text-[10px] font-semibold ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
                {day?.outletsVisited ?? 0}/{day?.beatOutlets ?? 0} outlets
              </div>
              <div className={`text-[10px] ${dark ? 'text-slate-500' : 'text-slate-500'}`}>
                Must be 100%
              </div>
            </div>
          </div>

          <div className="rounded-2xl p-3 flex items-center gap-3" style={tileBg(C.purp)}>
            <Ring
              pct={day?.hitRatePct || 0}
              size={64}
              color={ringHit}
              track={track}
              value={`${day?.hitRatePct ?? 0}%`}
              label=""
            />
            <div>
              <div className={`text-xs font-black ${dark ? 'text-white' : 'text-slate-900'}`}>
                Hit Rate
              </div>
              <div className={`text-[10px] font-semibold ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
                Productive ÷ planned
              </div>
              <div className={`text-[10px] ${dark ? 'text-slate-500' : 'text-slate-500'}`}>
                {day?.productiveCalls ?? 0}/{day?.beatOutlets ?? 0} outlets
              </div>
            </div>
          </div>

          <div className="rounded-2xl p-3 flex items-center gap-3" style={tileBg(C.deep)}>
            <Ring
              pct={day?.top10Pct || 0}
              size={64}
              color={ringTop}
              track={track}
              value={`${day?.top10HitCount ?? 0}/10`}
              label=""
            />
            <div>
              <div className={`text-xs font-black ${dark ? 'text-white' : 'text-slate-900'}`}>
                Top 10
              </div>
              <div className={`text-[10px] font-semibold ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
                Penetration {day?.top10Pct ?? 0}%
              </div>
              <button
                type="button"
                onClick={() => setShowTop10(!showTop10)}
                className={`text-[10px] font-bold ${dark ? 'text-[#2596be]' : ''}`}
                style={dark ? undefined : { color: C.cyan }}
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

        <div className="mt-3 grid grid-cols-2 gap-2.5 text-center">
          <div
            className={`rounded-2xl px-3 py-3.5 ${dark ? 'border border-slate-700' : ''}`}
            style={dark ? undefined : tileHot(lightSum)}
          >
            <div className={`text-[10px] font-black uppercase tracking-[0.15em] ${dark ? 'text-slate-400' : 'text-slate-700'}`}>
              Top 10 sum
            </div>
            <div
              className={`text-2xl font-black mt-1 ${dark ? 'text-amber-500' : ''}`}
              style={dark ? undefined : { color: lightSum }}
            >
              {day?.top10LineTotal ?? 0}
            </div>
            <div className={`text-[9px] font-semibold mt-0.5 ${dark ? 'text-slate-500' : 'text-slate-500'}`}>
              7+4+8 style total
            </div>
          </div>
          <div
            className={`rounded-2xl px-3 py-3.5 ${dark ? 'border border-slate-700' : ''}`}
            style={dark ? undefined : tileHot(lightAvg)}
          >
            <div className={`text-[10px] font-black uppercase tracking-[0.15em] ${dark ? 'text-slate-400' : 'text-slate-700'}`}>
              Top 10 avg
            </div>
            <div
              className={`text-2xl font-black mt-1 ${dark ? 'text-amber-500' : ''}`}
              style={dark ? undefined : { color: lightAvg }}
            >
              {day?.top10LineAvg ?? 0}
            </div>
            <div className={`text-[9px] font-semibold mt-0.5 ${dark ? 'text-slate-500' : 'text-slate-500'}`}>
              per productive call
            </div>
          </div>
        </div>
        <p className={`text-[10px] leading-relaxed mt-2 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
          Productive call = outlet buys ≥1 SKU. Coverage = visits ÷ planned beat.
          Hit rate = productive ÷ planned. Productivity % = productive ÷ (70% of planned).
          LPPC = lines ÷ productive calls. Top 10 % = unique /10; sum = lines across shops; avg = sum ÷ productive.
        </p>

        {/* MTD strip */}
        {mtd && (
          <div className={`mt-3 pt-3 border-t grid grid-cols-4 gap-1.5 text-center ${dark ? 'border-white/10' : 'border-slate-200'}`}>
            <div className="rounded-xl py-2" style={tileBg(C.purp)}>
              <div className={`text-[9px] font-bold ${dark ? 'text-slate-500' : 'text-slate-500'}`}>MTD Hit</div>
              <div className={`text-xs font-black ${dark ? 'text-violet-500' : ''}`} style={dark ? undefined : { color: C.purp }}>{mtd.hitRatePct}%</div>
            </div>
            <div className="rounded-xl py-2" style={tileBg(C.mag)}>
              <div className={`text-[9px] font-bold ${dark ? 'text-slate-500' : 'text-slate-500'}`}>MTD LPPC</div>
              <div className={`text-xs font-black ${dark ? 'text-emerald-500' : ''}`} style={dark ? undefined : { color: C.mag }}>{mtd.lppc}</div>
            </div>
            <div className="rounded-xl py-2" style={tileBg(C.cyan)}>
              <div className={`text-[9px] font-bold ${dark ? 'text-slate-500' : 'text-slate-500'}`}>MTD Prod</div>
              <div className={`text-xs font-black ${dark ? 'text-[#2596be]' : ''}`} style={dark ? undefined : { color: C.cyan }}>{mtd.productiveCalls}</div>
            </div>
            <div className="rounded-xl py-2" style={tileBg(C.deep)}>
              <div className={`text-[9px] font-bold ${dark ? 'text-slate-500' : 'text-slate-500'}`}>MTD Top10</div>
              <div className={`text-xs font-black ${dark ? 'text-amber-500' : ''}`} style={dark ? undefined : { color: C.deep }}>{mtd.top10HitCount}/10</div>
            </div>
          </div>
        )}
        {mtd && (
          <div className="mt-2 grid grid-cols-2 gap-2 text-center text-[10px]">
            <div
              className={`rounded-xl py-2.5 font-semibold ${dark ? 'text-slate-400' : ''}`}
              style={dark ? undefined : tileHot(lightSum)}
            >
              MTD Top10 sum{' '}
              <span
                className={`font-black text-base ml-1 ${dark ? 'text-amber-500' : ''}`}
                style={dark ? undefined : { color: lightSum }}
              >
                {mtd.top10LineTotal ?? 0}
              </span>
            </div>
            <div
              className={`rounded-xl py-2.5 font-semibold ${dark ? 'text-slate-400' : ''}`}
              style={dark ? undefined : tileHot(lightAvg)}
            >
              MTD Top10 avg{' '}
              <span
                className={`font-black text-base ml-1 ${dark ? 'text-amber-500' : ''}`}
                style={dark ? undefined : { color: lightAvg }}
              >
                {mtd.top10LineAvg ?? 0}
              </span>
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
          <div key={s.label} className={`rounded-2xl p-3 text-center border ${card}`} style={card3dStyle}>
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
            className={`flex flex-col items-center py-3 rounded-2xl border text-center ${card}`} style={card3dStyle}
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
        className="block w-full text-center text-white font-black py-4 rounded-2xl tracking-wide"
        style={{
          background: 'linear-gradient(145deg, #34d399, #059669 55%, #047857)',
          boxShadow: dark
            ? '0 14px 32px rgba(5,150,105,0.35)'
            : '0 4px 12px rgba(5,150,105,0.22)',
        }}
      >
        Start today&apos;s beat
      </Link>

      {/* Floating action button — circular menu */}
      <OmrFab dark={dark} />

    </div>
  );
}
