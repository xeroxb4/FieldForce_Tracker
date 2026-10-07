/** Executive admin — Softphone-style soft suspending glass */

export const ADMIN_ACCENT = '#3F258B';
export const ADMIN_CYAN = '#28B8F0';

export function useAdminPremium(dark) {
  const shell = dark
    ? 'bg-gradient-to-b from-[#030712] via-[#0a0f1e] to-[#030712]'
    : 'bg-gradient-to-b from-slate-100 via-slate-50 to-violet-50/40';

  /** Soft suspending card — mild lift, crisp edge (like Softphone) */
  const card = dark
    ? 'relative overflow-hidden rounded-[1.5rem] border border-white/[0.09] bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-transparent backdrop-blur-2xl'
    : 'relative overflow-hidden rounded-[1.5rem] border border-white/90 bg-gradient-to-b from-white via-white to-slate-50/90';

  const cardStyle = dark
    ? {
        boxShadow:
          '0 1px 0 0 rgba(255,255,255,0.08) inset, 0 10px 28px -6px rgba(0,0,0,0.38), 0 2px 6px rgba(0,0,0,0.18)',
      }
    : {
        boxShadow:
          '0 1px 0 0 rgba(255,255,255,1) inset, 0 8px 22px -6px rgba(15,23,42,0.1), 0 2px 6px rgba(15,23,42,0.04)',
      };

  /** Smaller list / row cards */
  const cardSoft = dark
    ? 'relative overflow-hidden rounded-[1.2rem] border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl'
    : 'relative overflow-hidden rounded-[1.2rem] border border-slate-200/80 bg-white';

  const cardSoftStyle = dark
    ? {
        boxShadow:
          '0 1px 0 rgba(255,255,255,0.06) inset, 0 6px 16px -4px rgba(0,0,0,0.32)',
      }
    : {
        boxShadow:
          '0 1px 0 rgba(255,255,255,1) inset, 0 4px 12px -2px rgba(15,23,42,0.07)',
      };

  const input = `w-full rounded-2xl px-4 py-3 text-sm font-semibold outline-none transition border focus:ring-2 focus:ring-[#3F258B]/35 ${
    dark
      ? 'bg-black/40 border-white/12 text-white placeholder:text-slate-400 focus:border-violet-400/45'
      : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-violet-400/50'
  }`;

  const label = `block text-[10px] font-black uppercase tracking-[0.18em] mb-1.5 ${
    dark ? 'text-violet-200' : 'text-[#3F258B]'
  }`;

  const title = dark ? 'text-white' : 'text-slate-900';
  const muted = dark ? 'text-slate-300' : 'text-slate-600';
  const soft = dark ? 'text-slate-400' : 'text-slate-500';

  const btnPrimary =
    'inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black text-white tracking-wide transition active:scale-[0.98] disabled:opacity-55';
  const btnPrimaryStyle = {
    background: 'linear-gradient(145deg, #6d4ad1, #3F258B 50%, #2a1860)',
    boxShadow: '0 1px 0 rgba(255,255,255,0.18) inset, 0 8px 20px rgba(63,37,139,0.32)',
  };

  const btnGhost = dark
    ? 'rounded-2xl px-4 py-2.5 text-sm font-bold border border-white/12 text-white bg-white/[0.06]'
    : 'rounded-2xl px-4 py-2.5 text-sm font-bold border border-slate-200 text-slate-800 bg-white';

  const modalOverlay =
    'fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-sm p-3 sm:p-4';
  const modalPanel = dark
    ? 'w-full max-w-md max-h-[92vh] overflow-y-auto rounded-[1.5rem] border border-white/[0.1] bg-gradient-to-br from-white/[0.08] via-slate-900 to-slate-950 p-5 space-y-3 backdrop-blur-2xl'
    : 'w-full max-w-md max-h-[92vh] overflow-y-auto rounded-[1.5rem] border border-slate-200/90 bg-white p-5 space-y-3';

  const modalPanelStyle = dark
    ? { boxShadow: '0 1px 0 rgba(255,255,255,0.08) inset, 0 24px 56px rgba(0,0,0,0.5)' }
    : { boxShadow: '0 1px 0 rgba(255,255,255,1) inset, 0 20px 48px rgba(15,23,42,0.14)' };

  const pageEyebrow = `text-[10px] font-black uppercase tracking-[0.22em] ${
    dark ? 'text-violet-200' : 'text-[#3F258B]'
  }`;

  const searchWrap = dark
    ? 'rounded-2xl border border-white/12 bg-black/35 px-3 py-2.5 flex items-center gap-2'
    : 'rounded-2xl border border-slate-200 bg-white px-3 py-2.5 flex items-center gap-2';

  const searchWrapStyle = dark
    ? { boxShadow: '0 1px 0 rgba(255,255,255,0.05) inset, 0 6px 16px rgba(0,0,0,0.25)' }
    : { boxShadow: '0 4px 12px rgba(15,23,42,0.05)' };

  const navActive = dark
    ? 'bg-gradient-to-r from-[#3F258B] to-[#5b3aad] text-white shadow-[0_6px_18px_rgba(63,37,139,0.4)]'
    : 'bg-gradient-to-r from-[#3F258B] to-[#5b3aad] text-white shadow-md shadow-violet-200/50';

  const navIdle = dark
    ? 'text-slate-200 hover:bg-white/[0.06] hover:text-white'
    : 'text-slate-700 hover:bg-violet-50';

  const headerBar = dark
    ? 'bg-[#030712]/92 border-white/[0.08] backdrop-blur-2xl'
    : 'bg-white/95 border-slate-200/80 backdrop-blur-2xl';

  const sidePanel = dark
    ? 'bg-gradient-to-b from-white/[0.07] via-[#0a0f1e]/95 to-[#070b14] border-white/[0.1] text-white backdrop-blur-2xl'
    : 'bg-gradient-to-b from-white via-white to-slate-50 border-slate-200/90 text-slate-900 backdrop-blur-2xl';

  const sidePanelStyle = dark
    ? {
        boxShadow:
          '0 1px 0 rgba(255,255,255,0.06) inset, 12px 0 32px rgba(0,0,0,0.4)',
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
    label,
    title,
    muted,
    soft,
    btnPrimary,
    btnPrimaryStyle,
    btnGhost,
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
