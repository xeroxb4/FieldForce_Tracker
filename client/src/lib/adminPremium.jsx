/** Executive admin design system
 *  Light: claymorphism (soft extruded clay cards — reference weather UI)
 *  Dark:  #F0C38E gold accent + high-contrast float
 */

export const ADMIN_ACCENT = '#3F258B';
export const ADMIN_ACCENT_DARK = '#F0C38E';
export const ADMIN_CYAN = '#28B8F0';

export function useAdminPremium(dark) {
  const accent = dark ? '#F0C38E' : '#3F258B';

  const shell = dark
    ? 'bg-gradient-to-b from-[#0c0f14] via-[#12151c] to-[#0c0f14]'
    : 'bg-gradient-to-b from-[#dfe8f2] via-[#e8eef6] to-[#d4e0ee]';

  /** Primary card — clay in light, float in dark */
  const card = dark
    ? 'admin-float relative overflow-visible'
    : 'admin-clay relative overflow-visible';

  const cardStyle = undefined; // owned by CSS classes

  const cardSoft = dark
    ? 'admin-float-soft relative overflow-visible'
    : 'admin-clay-soft relative overflow-visible';

  const cardSoftStyle = undefined;

  const input = `w-full rounded-2xl px-4 py-3.5 text-sm font-semibold outline-none transition border focus:ring-2 ${
    dark
      ? 'bg-[#1a1d24] border-white/20 text-white placeholder:text-slate-400 focus:border-[#F0C38E]/70 focus:ring-[#F0C38E]/25'
      : 'bg-[#f0f4fa] border-[#c5d0e0] text-slate-900 placeholder:text-slate-400 focus:border-[#3F258B]/50 focus:ring-[#3F258B]/25 shadow-[inset_2px_2px_6px_rgba(15,23,42,0.06),inset_-1px_-1px_4px_rgba(255,255,255,0.9)]'
  }`;

  const select = input;

  const label = `block text-[10px] font-black uppercase tracking-[0.18em] mb-1.5 ${
    dark ? 'text-[#F0C38E]' : 'text-[#3F258B]'
  }`;

  const title = dark ? 'text-white' : 'text-slate-900';
  const muted = dark ? 'text-slate-200' : 'text-slate-600';
  const soft = dark ? 'text-slate-300' : 'text-slate-500';

  const btnPrimary =
    'inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-black tracking-wide transition active:scale-[0.98] disabled:opacity-55';
  const btnPrimaryStyle = dark
    ? {
        background: 'linear-gradient(145deg, #F5D4A8, #F0C38E 45%, #D4A574)',
        color: '#1a1208',
        boxShadow: '0 1px 0 rgba(255,255,255,0.35) inset, 0 12px 28px rgba(240,195,142,0.35)',
      }
    : {
        background: 'linear-gradient(145deg, #6d4ad1, #3F258B 48%, #2a1860)',
        color: '#fff',
        boxShadow:
          '0 2px 0 rgba(255,255,255,0.2) inset, 0 8px 20px rgba(63,37,139,0.28), 0 2px 4px rgba(63,37,139,0.12)',
      };

  const btnGhost = dark
    ? 'rounded-2xl px-4 py-2.5 text-sm font-bold border border-white/20 text-white bg-white/10'
    : 'rounded-2xl px-4 py-2.5 text-sm font-bold border border-[#c5d0e0] text-slate-800 bg-[#eef2f8] shadow-[2px_2px_6px_rgba(15,23,42,0.06),-2px_-2px_6px_rgba(255,255,255,0.9)]';

  const btnDanger = dark
    ? 'rounded-2xl px-4 py-2.5 text-sm font-bold border border-red-400/40 text-red-200 bg-red-500/20'
    : 'rounded-2xl px-4 py-2.5 text-sm font-bold border border-red-200 text-red-600 bg-red-50';

  const modalOverlay =
    'fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-sm p-3 sm:p-4';
  const modalPanel = dark
    ? 'admin-float w-full max-w-md max-h-[92vh] overflow-y-auto p-5 space-y-3'
    : 'admin-clay w-full max-w-md max-h-[92vh] overflow-y-auto p-5 space-y-3';

  const modalPanelStyle = undefined;

  const pageEyebrow = `text-[10px] font-black uppercase tracking-[0.22em] ${
    dark ? 'text-[#F0C38E]' : 'text-[#3F258B]'
  }`;

  const searchWrap = dark
    ? 'rounded-2xl border border-white/20 bg-[#1a1d24] px-3 py-2.5 flex items-center gap-2'
    : 'rounded-2xl border border-[#c5d0e0] bg-[#f0f4fa] px-3 py-2.5 flex items-center gap-2 shadow-[inset_2px_2px_6px_rgba(15,23,42,0.05),inset_-1px_-1px_4px_rgba(255,255,255,0.9)]';

  const searchWrapStyle = undefined;

  const navActive = dark
    ? 'bg-gradient-to-r from-[#F0C38E] to-[#D4A574] text-[#1a1208] shadow-[0_10px_28px_rgba(240,195,142,0.35)]'
    : 'bg-gradient-to-r from-[#3F258B] to-[#5b3aad] text-white shadow-[4px_4px_12px_rgba(63,37,139,0.25),-2px_-2px_8px_rgba(255,255,255,0.8)]';

  const navIdle = dark
    ? 'text-slate-100 hover:bg-white/10 hover:text-white'
    : 'text-slate-700 hover:bg-white/70';

  const headerBar = dark
    ? 'bg-[#0c0f14]/95 border-white/12 backdrop-blur-2xl'
    : 'bg-[#e8eef6]/92 border-[#c5d0e0]/80 backdrop-blur-2xl';

  const sidePanel = dark
    ? 'admin-float border-r border-white/12 text-white backdrop-blur-2xl'
    : 'admin-clay border-r border-[#c5d0e0] text-slate-900';

  const sidePanelStyle = dark
    ? { borderRadius: 0, boxShadow: '16px 0 48px rgba(0,0,0,0.55)' }
    : { borderRadius: 0 };

  /** Coloured clay KPI tiles (light reference) */
  const clayBlue =
    'admin-clay-color relative overflow-visible text-white';
  const clayBlueStyle = {
    background: 'linear-gradient(145deg, #5BA3E8 0%, #3B82F6 55%, #2563EB 100%)',
  };
  const clayCyan = 'admin-clay-color relative overflow-visible text-white';
  const clayCyanStyle = {
    background: 'linear-gradient(145deg, #2DD4BF 0%, #14B8A6 55%, #0D9488 100%)',
  };
  const clayCream = 'admin-clay-color relative overflow-visible text-slate-800';
  const clayCreamStyle = {
    background: 'linear-gradient(145deg, #F8F6F1 0%, #F1EDE4 55%, #E8E2D6 100%)',
  };
  const clayPurple = 'admin-clay-color relative overflow-visible text-white';
  const clayPurpleStyle = {
    background: 'linear-gradient(145deg, #8B6BC9 0%, #3F258B 55%, #2a1860 100%)',
  };
  const clayRose = 'admin-clay-color relative overflow-visible text-white';
  const clayRoseStyle = {
    background: 'linear-gradient(145deg, #FB7185 0%, #E11D48 55%, #BE123C 100%)',
  };
  const clayGreen = 'admin-clay-color relative overflow-visible text-white';
  const clayGreenStyle = {
    background: 'linear-gradient(145deg, #34D399 0%, #10B981 55%, #059669 100%)',
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
    accent,
    accentDark: '#F0C38E',
    clayBlue,
    clayBlueStyle,
    clayCyan,
    clayCyanStyle,
    clayCream,
    clayCreamStyle,
    clayPurple,
    clayPurpleStyle,
    clayRose,
    clayRoseStyle,
    clayGreen,
    clayGreenStyle,
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
