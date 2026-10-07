/** Executive admin — dark mode standout 3D glass */

export const ADMIN_ACCENT = '#3F258B';
export const ADMIN_CYAN = '#28B8F0';

export function useAdminPremium(dark) {
  const shell = dark
    ? 'bg-gradient-to-b from-[#020617] via-[#0b1224] to-[#020617]'
    : 'bg-gradient-to-b from-slate-100 via-slate-50 to-violet-50/40';

  /** High-visibility suspending card (dark = stronger edge + lift) */
  const card = dark
    ? 'relative overflow-visible rounded-[1.35rem] border border-white/20 bg-gradient-to-br from-slate-800/95 via-slate-900/90 to-[#0a0f1e] backdrop-blur-2xl'
    : 'relative overflow-hidden rounded-[1.5rem] border border-white/90 bg-gradient-to-b from-white via-white to-slate-50/90';

  const cardStyle = dark
    ? {
        boxShadow:
          '0 1.5px 0 0 rgba(255,255,255,0.16) inset, 0 -1px 0 0 rgba(0,0,0,0.45) inset, 0 4px 8px rgba(0,0,0,0.25), 0 18px 40px -8px rgba(0,0,0,0.65), 0 0 0 1px rgba(63,37,139,0.25)',
      }
    : {
        boxShadow:
          '0 1px 0 0 rgba(255,255,255,1) inset, 0 8px 22px -6px rgba(15,23,42,0.1), 0 2px 6px rgba(15,23,42,0.04)',
      };

  const cardSoft = dark
    ? 'relative overflow-visible rounded-[1.15rem] border border-white/15 bg-slate-800/80 backdrop-blur-xl'
    : 'relative overflow-hidden rounded-[1.2rem] border border-slate-200/80 bg-white';

  const cardSoftStyle = dark
    ? {
        boxShadow:
          '0 1px 0 rgba(255,255,255,0.12) inset, 0 10px 24px -4px rgba(0,0,0,0.5)',
      }
    : {
        boxShadow:
          '0 1px 0 rgba(255,255,255,1) inset, 0 4px 12px -2px rgba(15,23,42,0.07)',
      };

  const input = `w-full rounded-2xl px-4 py-3.5 text-sm font-semibold outline-none transition border focus:ring-2 focus:ring-[#3F258B]/45 ${
    dark
      ? 'bg-slate-950 border-white/20 text-white placeholder:text-slate-400 focus:border-violet-400/60'
      : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-violet-400/50'
  }`;

  /** Native select / list triggers — more expensive than default */
  const select = `w-full rounded-2xl px-4 py-3.5 text-sm font-semibold outline-none transition border appearance-none focus:ring-2 focus:ring-[#3F258B]/45 ${
    dark
      ? 'bg-slate-950 border-white/20 text-white focus:border-violet-400/60'
      : 'bg-white border-slate-200 text-slate-900 focus:border-violet-400/50'
  }`;

  const label = `block text-[10px] font-black uppercase tracking-[0.18em] mb-1.5 ${
    dark ? 'text-violet-200' : 'text-[#3F258B]'
  }`;

  // High contrast type
  const title = dark ? 'text-white' : 'text-slate-900';
  const muted = dark ? 'text-slate-200' : 'text-slate-600';
  const soft = dark ? 'text-slate-300' : 'text-slate-500';

  const btnPrimary =
    'inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-black text-white tracking-wide transition active:scale-[0.98] disabled:opacity-55';
  const btnPrimaryStyle = {
    background: 'linear-gradient(145deg, #7c5cde, #3F258B 48%, #2a1860)',
    boxShadow: dark
      ? '0 1px 0 rgba(255,255,255,0.22) inset, 0 10px 28px rgba(63,37,139,0.55)'
      : '0 1px 0 rgba(255,255,255,0.18) inset, 0 8px 20px rgba(63,37,139,0.32)',
  };

  const btnGhost = dark
    ? 'rounded-2xl px-4 py-2.5 text-sm font-bold border border-white/20 text-white bg-white/10'
    : 'rounded-2xl px-4 py-2.5 text-sm font-bold border border-slate-200 text-slate-800 bg-white';

  const btnDanger = dark
    ? 'rounded-2xl px-4 py-2.5 text-sm font-bold border border-red-400/30 text-red-300 bg-red-500/15'
    : 'rounded-2xl px-4 py-2.5 text-sm font-bold border border-red-200 text-red-600 bg-red-50';

  const modalOverlay =
    'fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-md p-3 sm:p-4';
  const modalPanel = dark
    ? 'w-full max-w-md max-h-[92vh] overflow-y-auto rounded-[1.5rem] border border-white/20 bg-gradient-to-br from-slate-800 via-slate-900 to-[#0a0f1e] p-5 space-y-3'
    : 'w-full max-w-md max-h-[92vh] overflow-y-auto rounded-[1.5rem] border border-slate-200/90 bg-white p-5 space-y-3';

  const modalPanelStyle = dark
    ? {
        boxShadow:
          '0 1.5px 0 rgba(255,255,255,0.14) inset, 0 28px 64px rgba(0,0,0,0.7)',
      }
    : {
        boxShadow:
          '0 1px 0 rgba(255,255,255,1) inset, 0 20px 48px rgba(15,23,42,0.14)',
      };

  const pageEyebrow = `text-[10px] font-black uppercase tracking-[0.22em] ${
    dark ? 'text-violet-200' : 'text-[#3F258B]'
  }`;

  const searchWrap = dark
    ? 'rounded-2xl border border-white/20 bg-slate-950 px-3 py-2.5 flex items-center gap-2'
    : 'rounded-2xl border border-slate-200 bg-white px-3 py-2.5 flex items-center gap-2';

  const searchWrapStyle = dark
    ? { boxShadow: '0 1px 0 rgba(255,255,255,0.08) inset, 0 8px 20px rgba(0,0,0,0.35)' }
    : { boxShadow: '0 4px 12px rgba(15,23,42,0.05)' };

  const navActive = dark
    ? 'bg-gradient-to-r from-[#3F258B] to-[#6d4ad1] text-white shadow-[0_8px_24px_rgba(63,37,139,0.55)]'
    : 'bg-gradient-to-r from-[#3F258B] to-[#5b3aad] text-white shadow-md shadow-violet-200/50';

  const navIdle = dark
    ? 'text-slate-100 hover:bg-white/10 hover:text-white'
    : 'text-slate-700 hover:bg-violet-50';

  const headerBar = dark
    ? 'bg-[#020617]/95 border-white/15 backdrop-blur-2xl'
    : 'bg-white/95 border-slate-200/80 backdrop-blur-2xl';

  const sidePanel = dark
    ? 'bg-gradient-to-b from-slate-800/98 via-[#0f1528] to-[#070b14] border-white/15 text-white backdrop-blur-2xl'
    : 'bg-gradient-to-b from-white via-white to-slate-50 border-slate-200/90 text-slate-900 backdrop-blur-2xl';

  const sidePanelStyle = dark
    ? {
        boxShadow:
          '0 1.5px 0 rgba(255,255,255,0.12) inset, 16px 0 40px rgba(0,0,0,0.55)',
      }
    : {
        boxShadow:
          '0 1px 0 rgba(255,255,255,1) inset, 12px 0 32px rgba(15,23,42,0.08)',
      };

  return {
    shell,
    card,
    cardStyle,
    cardSoft,
    cardSoftStyle,
    input,
    select,
    label,
    title,
    muted,
    soft,
    btnPrimary,
    btnPrimaryStyle,
    btnGhost,
    btnDanger,
    modalOverlay,
    modalPanel,
    modalPanelStyle,
    pageEyebrow,
    searchWrap,
    searchWrapStyle,
    navActive,
    navIdle,
    headerBar,
    sidePanel,
    sidePanelStyle,
    accent: ADMIN_ACCENT,
  };
}

export function AdminPageHeader({ dark, eyebrow = 'Command', title, subtitle, right }) {
  const ap = useAdminPremium(dark);
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5">
      <div className="min-w-0">
        <p className={ap.pageEyebrow}>{eyebrow}</p>
        <h1 className={`text-2xl font-black tracking-tight mt-0.5 ${ap.title}`}>{title}</h1>
        {subtitle ? <p className={`text-sm font-medium mt-1 ${ap.muted}`}>{subtitle}</p> : null}
      </div>
      {right}
    </div>
  );
}
