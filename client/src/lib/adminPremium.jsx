/** Executive admin design system — 3D glass + high-contrast type */

export const ADMIN_ACCENT = "#3F258B";
export const ADMIN_CYAN = "#28B8F0";

export function useAdminPremium(dark) {
  const shell = dark
    ? "bg-gradient-to-b from-[#020617] via-[#0a0f1e] to-[#020617]"
    : "bg-gradient-to-b from-slate-200/80 via-slate-100 to-violet-50/50";

  /** Primary 3D floating glass card */
  const card = dark
    ? "relative overflow-hidden rounded-[1.35rem] border border-white/15 bg-gradient-to-br from-slate-800/90 via-slate-900/85 to-slate-950/95 backdrop-blur-2xl"
    : "relative overflow-hidden rounded-[1.35rem] border border-white/90 bg-gradient-to-b from-white to-slate-50 shadow-sm";

  const cardStyle = dark
    ? {
        boxShadow:
          "0 1.5px 0 0 rgba(255,255,255,0.12) inset, 0 -1px 0 0 rgba(0,0,0,0.4) inset, 0 8px 16px -4px rgba(0,0,0,0.45), 0 28px 56px -12px rgba(0,0,0,0.65)",
      }
    : {
        boxShadow:
          "0 1.5px 0 0 rgba(255,255,255,1) inset, 0 -1px 0 0 rgba(15,23,42,0.04) inset, 0 8px 20px -4px rgba(15,23,42,0.1), 0 24px 48px -12px rgba(15,23,42,0.12)",
      };

  const input = `w-full rounded-2xl px-4 py-3 text-sm font-semibold outline-none transition border focus:ring-2 focus:ring-[#3F258B]/40 ${
    dark
      ? "bg-black/50 border-white/15 text-white placeholder:text-slate-400 focus:border-violet-400/50"
      : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-violet-400/60 shadow-inner"
  }`;

  const label = `block text-[10px] font-black uppercase tracking-[0.18em] mb-1.5 ${
    dark ? "text-violet-200" : "text-[#3F258B]"
  }`;

  // High-contrast type on glass
  const title = dark ? "text-white" : "text-slate-900";
  const muted = dark ? "text-slate-300" : "text-slate-600";
  const soft = dark ? "text-slate-400" : "text-slate-500";

  const btnPrimary =
    "inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black text-white tracking-wide transition active:scale-[0.98] disabled:opacity-55";
  const btnPrimaryStyle = {
    background: "linear-gradient(145deg, #6d4ad1, #3F258B 50%, #2a1860)",
    boxShadow:
      "0 1px 0 rgba(255,255,255,0.2) inset, 0 10px 28px rgba(63,37,139,0.45), 0 4px 8px rgba(63,37,139,0.2)",
  };

  const btnGhost = dark
    ? "rounded-2xl px-4 py-2.5 text-sm font-bold border border-white/15 text-white bg-white/10"
    : "rounded-2xl px-4 py-2.5 text-sm font-bold border border-slate-200 text-slate-800 bg-white shadow-sm";

  const modalOverlay =
    "fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md p-3 sm:p-4";
  const modalPanel = dark
    ? "w-full max-w-md max-h-[92vh] overflow-y-auto rounded-[1.5rem] border border-white/15 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 p-5 space-y-3"
    : "w-full max-w-md max-h-[92vh] overflow-y-auto rounded-[1.5rem] border border-slate-200 bg-white p-5 space-y-3";

  const modalPanelStyle = dark
    ? {
        boxShadow:
          "0 1px 0 rgba(255,255,255,0.1) inset, 0 32px 80px rgba(0,0,0,0.7)",
      }
    : {
        boxShadow:
          "0 1px 0 rgba(255,255,255,1) inset, 0 32px 80px rgba(15,23,42,0.2)",
      };

  const pageEyebrow = `text-[10px] font-black uppercase tracking-[0.22em] ${
    dark ? "text-violet-200" : "text-[#3F258B]"
  }`;

  const searchWrap = dark
    ? "rounded-2xl border border-white/15 bg-black/40 px-3 py-2.5 flex items-center gap-2 shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)]"
    : "rounded-2xl border border-slate-200 bg-white px-3 py-2.5 flex items-center gap-2 shadow-sm";

  const navActive = dark
    ? "bg-gradient-to-r from-[#3F258B] to-[#5b3aad] text-white shadow-[0_8px_24px_rgba(63,37,139,0.5)]"
    : "bg-gradient-to-r from-[#3F258B] to-[#5b3aad] text-white shadow-md shadow-violet-300/40";

  const navIdle = dark
    ? "text-slate-200 hover:bg-white/10 hover:text-white"
    : "text-slate-700 hover:bg-violet-50";

  const headerBar = dark
    ? "bg-[#020617]/95 border-white/10 backdrop-blur-2xl"
    : "bg-white/95 border-slate-200/80 backdrop-blur-2xl shadow-sm";

  /** Side drawer — strong 3D glass panel */
  const sidePanel = dark
    ? "bg-gradient-to-b from-slate-800/95 via-slate-900/95 to-[#070b14] border-white/12 text-white backdrop-blur-2xl"
    : "bg-gradient-to-b from-white via-white to-slate-50 border-slate-200 text-slate-900 backdrop-blur-2xl";

  const sidePanelStyle = dark
    ? {
        boxShadow:
          "8px 0 40px rgba(0,0,0,0.55), inset 1px 0 0 rgba(255,255,255,0.08)",
      }
    : {
        boxShadow:
          "8px 0 40px rgba(15,23,42,0.12), inset 1px 0 0 rgba(255,255,255,1)",
      };

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
    modalPanelStyle,
    pageEyebrow,
    searchWrap,
    navActive,
    navIdle,
    headerBar,
    sidePanel,
    sidePanelStyle,
    accent: ADMIN_ACCENT,
  };
}

export function AdminPageHeader({ dark, eyebrow = "Command", title, subtitle, right }) {
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
