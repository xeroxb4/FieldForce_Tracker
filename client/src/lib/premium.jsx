/** Shared ultra-premium design tokens for FieldForce OMR screens */

export const ACCENT = '#3F258B';
export const ACCENT_SOFT = '#5b3aad';
export const ACCENT_GLOW = 'rgba(63,37,139,0.45)';

export function usePremium(dark) {
  const shell = dark
    ? 'bg-gradient-to-b from-slate-950 via-[#070b14] to-slate-950'
    : 'bg-gradient-to-b from-slate-200/80 via-slate-100 to-violet-100/50';

  // Light mode: solid white + stronger border + deeper shadow so cards pop off the bg
  const glass = dark
    ? 'bg-slate-900/80 border border-white/12 backdrop-blur-2xl shadow-[0_24px_64px_rgba(0,0,0,0.55)]'
    : 'bg-white border border-slate-300/90 backdrop-blur-2xl shadow-[0_12px_40px_rgba(15,23,42,0.10),0_2px_8px_rgba(15,23,42,0.06)]';

  const glassSoft = dark
    ? 'bg-slate-900/55 border border-white/10 backdrop-blur-xl'
    : 'bg-white border border-slate-250 shadow-[0_6px_24px_rgba(15,23,42,0.07)]';

  const label = `block text-[10px] font-black uppercase tracking-[0.2em] mb-2 ${
    dark ? 'text-violet-300/90' : 'text-[#3F258B]'
  }`;

  const input = `w-full rounded-2xl px-4 py-3.5 text-sm border font-semibold outline-none transition focus:ring-2 focus:ring-[#3F258B]/40 ${
    dark
      ? 'bg-slate-950/90 border-slate-600/80 text-white placeholder:text-slate-500'
      : 'bg-slate-50/90 border-slate-200 text-slate-900 placeholder:text-slate-400'
  }`;

  const title = dark ? 'text-white' : 'text-slate-900';
  const muted = dark ? 'text-slate-300' : 'text-slate-600';
  const soft = dark ? 'text-slate-400' : 'text-slate-500';
  const chip = dark
    ? 'bg-violet-500/15 text-violet-200 border border-violet-400/25'
    : 'bg-violet-50 text-[#3F258B] border border-violet-200';

  const btnPrimary =
    'inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-black text-white tracking-wide disabled:opacity-55 transition active:scale-[0.98]';
  const btnPrimaryStyle = {
    background: 'linear-gradient(135deg, #5b3aad, #3F258B 55%, #2a1860)',
    boxShadow: '0 14px 36px rgba(63,37,139,0.4)',
  };

  /** Green CTA — Start visit / Start today's beat */
  const btnSuccess =
    'inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-black text-white tracking-wide disabled:opacity-55 transition active:scale-[0.98]';
  const btnSuccessStyle = {
    background: 'linear-gradient(145deg, #34d399, #059669 55%, #047857)',
    boxShadow: '0 14px 36px rgba(5,150,105,0.4)',
  };

  const btnGhost = dark
    ? 'rounded-2xl px-4 py-3 text-sm font-bold border border-slate-600 text-slate-200 bg-slate-900/60'
    : 'rounded-2xl px-4 py-3 text-sm font-bold border border-slate-300 text-slate-700 bg-white shadow-sm';

  const heroStyle = {
    background: dark
      ? 'linear-gradient(135deg, #0a0618 0%, #1a0f3a 42%, #3F258B 100%)'
      : 'linear-gradient(135deg, #2a1860 0%, #3F258B 48%, #6d4fc4 100%)',
    boxShadow: '0 28px 56px rgba(63,37,139,0.28)',
  };

  return {
    shell,
    glass,
    glassSoft,
    label,
    input,
    title,
    muted,
    soft,
    chip,
    btnPrimary,
    btnPrimaryStyle,
    btnSuccess,
    btnSuccessStyle,
    btnGhost,
    heroStyle,
    accent: ACCENT,
  };
}

/** Cinematic page hero */
export function PremiumHero({ dark, eyebrow, title, subtitle, right, children }) {
  const style = {
    background: dark
      ? 'linear-gradient(135deg, #0a0618 0%, #1a0f3a 42%, #3F258B 100%)'
      : 'linear-gradient(135deg, #2a1860 0%, #3F258B 48%, #6d4fc4 100%)',
    boxShadow: '0 28px 56px rgba(63,37,139,0.28)',
  };
  return (
    <div className="relative overflow-hidden rounded-[1.75rem] p-6 mb-5 text-white" style={style}>
      <div className="absolute -right-12 -top-12 w-52 h-52 rounded-full bg-violet-300/20 blur-3xl pointer-events-none" />
      <div className="absolute left-1/3 bottom-0 w-36 h-36 -translate-x-1/2 rounded-full bg-white/10 blur-3xl pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.07] pointer-events-none" style={{
        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
      }} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-violet-200/85 mb-1.5">
              {eyebrow}
            </p>
          )}
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">{title}</h2>
          {subtitle && (
            <p className="text-sm text-white/80 font-medium mt-1.5 leading-relaxed">{subtitle}</p>
          )}
          {children}
        </div>
        {right}
      </div>
    </div>
  );
}
