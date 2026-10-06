/** Executive admin design system — FieldForce Command */

export const ADMIN_ACCENT = '#3F258B';
export const ADMIN_CYAN = '#28B8F0';

export function useAdminPremium(dark) {
  const shell = dark
    ? 'bg-gradient-to-b from-[#030712] via-[#0a0f1e] to-[#030712]'
    : 'bg-gradient-to-b from-slate-100 via-slate-50 to-violet-50/40';

  const card = dark
    ? 'relative overflow-hidden rounded-[1.35rem] border border-white/[0.08] bg-gradient-to-br from-white/[0.07] via-white/[0.03] to-transparent backdrop-blur-xl'
    : 'relative overflow-hidden rounded-[1.35rem] border border-slate-200/90 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.06)]';

  const cardStyle = dark
    ? { boxShadow: '0 20px 48px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)' }
    : { boxShadow: '0 1px 0 rgba(255,255,255,1) inset, 0 12px 32px rgba(15,23,42,0.06)' };

  const input = `w-full rounded-2xl px-4 py-3 text-sm font-semibold outline-none transition border focus:ring-2 focus:ring-[#3F258B]/35 ${
    dark
      ? 'bg-black/40 border-white/10 text-white placeholder:text-slate-500 focus:border-violet-400/40'
      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-violet-400/50'
  }`;

  const label = `block text-[10px] font-black uppercase tracking-[0.18em] mb-1.5 ${
    dark ? 'text-violet-300/85' : 'text-[#3F258B]'
  }`;

  const title = dark ? 'text-white' : 'text-slate-900';
  const muted = dark ? 'text-slate-400' : 'text-slate-500';
  const soft = dark ? 'text-slate-500' : 'text-slate-400';

  const btnPrimary =
    'inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black text-white tracking-wide transition active:scale-[0.98] disabled:opacity-55';
  const btnPrimaryStyle = {
    background: 'linear-gradient(135deg, #5b3aad, #3F258B 55%, #2a1860)',
    boxShadow: '0 1px 0 rgba(255,255,255,0.15) inset, 0 10px 28px rgba(63,37,139,0.35)',
  };

  const btnGhost = dark
    ? 'rounded-2xl px-4 py-2.5 text-sm font-bold border border-white/12 text-slate-200 bg-white/5'
    : 'rounded-2xl px-4 py-2.5 text-sm font-bold border border-slate-200 text-slate-700 bg-white shadow-sm';

  const modalOverlay = 'fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-sm p-3 sm:p-4';
  const modalPanel = dark
    ? 'w-full max-w-md max-h-[92vh] overflow-y-auto rounded-[1.5rem] border border-white/10 bg-slate-950 p-5 space-y-3'
    : 'w-full max-w-md max-h-[92vh] overflow-y-auto rounded-[1.5rem] border border-slate-200 bg-white p-5 space-y-3 shadow-2xl';

  const pageEyebrow = `text-[10px] font-black uppercase tracking-[0.22em] ${
    dark ? 'text-violet-300/80' : 'text-[#3F258B]'
  }`;

  const searchWrap = dark
    ? 'rounded-2xl border border-white/10 bg-black/30 px-3 py-2.5 flex items-center gap-2'
    : 'rounded-2xl border border-slate-200 bg-white px-3 py-2.5 flex items-center gap-2 shadow-sm';

  const navActive = dark
    ? 'bg-gradient-to-r from-[#3F258B]/90 to-[#5b3aad]/70 text-white shadow-lg shadow-violet-950/40'
    : 'bg-gradient-to-r from-[#3F258B] to-[#5b3aad] text-white shadow-md shadow-violet-200/50';

  const navIdle = dark
    ? 'text-slate-300 hover:bg-white/5'
    : 'text-slate-600 hover:bg-violet-50';

  const headerBar = dark
    ? 'bg-[#030712]/90 border-white/8 backdrop-blur-xl'
    : 'bg-white/90 border-slate-200/80 backdrop-blur-xl shadow-sm';

  const sidePanel = dark
    ? 'bg-[#070b14]/95 border-white/10 text-white backdrop-blur-2xl'
    : 'bg-white/98 border-slate-200 text-slate-900 backdrop-blur-2xl shadow-2xl';

  return {
    shell,
    card,
    cardStyle,
    input,
    label,
    title,
    muted,
    soft,
    btnPrimary,
    btnPrimaryStyle,
    btnGhost,
    modalOverlay,
    modalPanel,
    pageEyebrow,
    searchWrap,
    navActive,
    navIdle,
    headerBar,
    sidePanel,
    accent: ADMIN_ACCENT,
  };
}

export function AdminPageHeader({ dark, eyebrow = 'Command', title, subtitle, right }) {
  const a = useAdminPremium(dark);
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5">
      <div className="min-w-0">
        <p className={a.pageEyebrow}>{eyebrow}</p>
        <h1 className={`text-2xl font-black tracking-tight mt-0.5 ${a.title}`}>{title}</h1>
        {subtitle && <p className={`text-sm font-medium mt-1 ${a.muted}`}>{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}
