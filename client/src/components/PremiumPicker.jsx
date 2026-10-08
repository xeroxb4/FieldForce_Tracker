import { useMemo, useState } from 'react';
import { useTheme } from '../context/ThemeContext';

/**
 * $15k-feel bottom sheet picker (replaces native <select> popups on mobile)
 * options: [{ value, label, sub? }]
 */
export default function PremiumPicker({
  open,
  onClose,
  title = 'Select',
  options = [],
  value,
  onChange,
  searchable = true,
}) {
  const { dark } = useTheme();
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return options;
    return options.filter(
      (o) =>
        String(o.label || '').toLowerCase().includes(qq) ||
        String(o.sub || '').toLowerCase().includes(qq) ||
        String(o.value || '').toLowerCase().includes(qq)
    );
  }, [options, q]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className={`relative w-full max-w-lg max-h-[78vh] flex flex-col rounded-t-[1.75rem] overflow-hidden border-t ${
          dark
            ? 'bg-gradient-to-b from-slate-800 via-slate-900 to-[#020617] border-white/20'
            : 'admin-clay border-0'
        }`}
        style={{
          boxShadow: dark
            ? '0 1.5px 0 rgba(255,255,255,0.14) inset, 0 -24px 64px rgba(0,0,0,0.65)'
            : '0 1px 0 rgba(255,255,255,1) inset, 0 -20px 48px rgba(15,23,42,0.18)',
        }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className={`w-10 h-1 rounded-full ${dark ? 'bg-white/25' : 'bg-slate-300'}`} />
        </div>
        <div className="px-4 pb-3 flex items-center justify-between gap-3">
          <div>
            <p
              className={`text-[10px] font-black uppercase tracking-[0.2em] ${
                dark ? 'text-[#F0C38E]' : 'text-[#3F258B]'
              }`}
            >
              Choose
            </p>
            <h3 className={`text-lg font-black ${dark ? 'text-white' : 'text-slate-900'}`}>{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`w-9 h-9 rounded-xl text-lg font-bold ${
              dark ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            ×
          </button>
        </div>
        {searchable && options.length > 6 && (
          <div className="px-4 pb-3">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search…"
              className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold border outline-none ${
                dark
                  ? 'bg-[#020617] border-white/20 text-white placeholder:text-slate-400'
                  : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            />
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-3 pb-6 space-y-1.5">
          {filtered.map((o) => {
            const active = String(o.value) === String(value);
            return (
              <button
                key={String(o.value)}
                type="button"
                onClick={() => {
                  onChange(o.value, o);
                  onClose();
                  setQ('');
                }}
                className={`w-full text-left rounded-2xl px-4 py-3.5 flex items-center justify-between gap-3 border transition ${
                  active
                    ? dark
                      ? 'bg-[#F0C38E]/20 border-[#F0C38E]/45'
                      : 'bg-violet-50 border-[#3F258B]/35'
                    : dark
                    ? 'bg-white/[0.04] border-white/10'
                    : 'bg-white border-slate-200 shadow-sm'
                }`}
                style={
                  active
                    ? {
                        boxShadow: dark
                          ? '0 8px 24px rgba(240,195,142,0.3)'
                          : '0 8px 24px rgba(63,37,139,0.12)',
                      }
                    : dark
                    ? { boxShadow: '0 1px 0 rgba(255,255,255,0.06) inset' }
                    : {
                        boxShadow:
                          '4px 4px 12px rgba(148,163,184,0.28), -3px -3px 10px rgba(255,255,255,0.9), inset 1px 1px 1px rgba(255,255,255,1)',
                      }
                }
              >
                <div className="min-w-0">
                  <div className={`text-sm font-black truncate ${dark ? 'text-white' : 'text-slate-900'}`}>
                    {o.label}
                  </div>
                  {o.sub ? (
                    <div className={`text-[11px] mt-0.5 truncate ${dark ? 'text-slate-300' : 'text-slate-500'}`}>
                      {o.sub}
                    </div>
                  ) : null}
                </div>
                <span
                  className={`w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center text-[10px] ${
                    active
                      ? 'border-transparent text-white'
                      : dark
                      ? 'border-slate-500'
                      : 'border-slate-300'
                  }`}
                  style={
                    active
                      ? { background: dark ? 'linear-gradient(145deg, #F5D4A8, #F0C38E)' : 'linear-gradient(145deg, #6d4ad1, #3F258B)' }
                      : undefined
                  }
                >
                  {active ? '✓' : ''}
                </span>
              </button>
            );
          })}
          {!filtered.length && (
            <p className={`text-center text-sm py-8 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
              No matches
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
