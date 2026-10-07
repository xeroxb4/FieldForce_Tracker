import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useAdminPremium } from '../../lib/adminPremium';
import { ensureNotifyPermission, pollAdminNotifications } from '../../services/notify';
import api from '../../services/api';
import logo from '../../assets/logo.jpeg';

const NAV = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/admin/sales', label: 'Sales', icon: '💰' },
  { to: '/admin/targets', label: 'Targets', icon: '🎯' },
  { to: '/admin/distributors', label: 'Distributors', icon: '🏢' },
  { to: '/admin/analytics', label: 'Data Analysis', icon: '📈' },
  { to: '/admin/products', label: 'Products', icon: '🧴' },
  { to: '/admin/programs', label: 'Programs', icon: '🎯' },
  { to: '/admin/promotions', label: 'Promotions', icon: '📣' },
  { to: '/admin/outlets', label: 'Outlets & Beats', icon: '📍' },
  { to: '/admin/avc-photos', label: 'AVC photos', icon: '📷' },
  { to: '/admin/outlet-sales', label: 'Outlet sales', icon: '📈' },
  { to: '/admin/attendance', label: 'Check-ins', icon: '✅' },
  { to: '/admin/reports', label: 'OMR reports', icon: '📋' },
  { to: '/admin/enter-sale', label: 'Enter sale', icon: '✍️' },
  { to: '/admin/export', label: 'Export', icon: '⬇️' },
  { to: '/admin/softphone', label: 'Softphone', icon: '📞' },
  { to: '/admin/notifications', label: 'Notifications', icon: '🔔' },
  { to: '/admin/settings', label: 'Settings', icon: '⚙️' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const ap = useAdminPremium(dark);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unreadNotif, setUnreadNotif] = useState(0);
  const touchStart = useRef({ x: 0, y: 0, edge: false });

  useEffect(() => {
    ensureNotifyPermission();
    let cancelled = false;
    const tick = async () => {
      try {
        const n = await pollAdminNotifications(api);
        if (!cancelled && typeof n === 'number') setUnreadNotif(n);
      } catch {
        /* ignore */
      }
    };
    tick();
    const id = setInterval(tick, 45000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Swipe: from left edge → open; on open panel swipe left → close
  useEffect(() => {
    const EDGE = 28; // px from left of screen
    const MIN = 50;

    const onStart = (e) => {
      const t = e.touches?.[0];
      if (!t) return;
      touchStart.current = {
        x: t.clientX,
        y: t.clientY,
        edge: t.clientX <= EDGE,
      };
    };

    const onEnd = (e) => {
      const t = e.changedTouches?.[0];
      if (!t) return;
      const dx = t.clientX - touchStart.current.x;
      const dy = t.clientY - touchStart.current.y;
      if (Math.abs(dx) < MIN || Math.abs(dx) < Math.abs(dy)) return;

      // Open: swipe right starting near left edge
      if (!open && touchStart.current.edge && dx > MIN) {
        setOpen(true);
        return;
      }
      // Close: swipe left while menu open
      if (open && dx < -MIN) {
        setOpen(false);
      }
    };

    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchend', onEnd);
    };
  }, [open]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const closeMenu = () => setOpen(false);

  return (
    <div className={`min-h-screen flex flex-col admin-premium-font ${ap.shell}`}>
      <header
        className={`sticky top-0 z-40 flex items-center justify-between gap-3 px-3 sm:px-4 py-3 border-b ${ap.headerBar}`}
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={`shrink-0 relative inline-flex items-center gap-2 rounded-2xl px-3.5 py-2.5 text-sm font-black ${
              dark
                ? 'bg-white/10 text-white border border-white/12'
                : 'bg-violet-50 text-[#3F258B] border border-violet-200'
            }`}
            aria-label="Open menu"
          >
            <span className="text-base leading-none">☰</span>
            <span className="hidden sm:inline">Menu</span>
            {unreadNotif > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-red-500 text-white text-[9px] font-extrabold flex items-center justify-center">
                {unreadNotif > 9 ? '9+' : unreadNotif}
              </span>
            )}
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <img src={logo} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
            <div className="min-w-0">
              <div className={`text-sm font-extrabold truncate ${dark ? 'text-white' : 'text-slate-900'}`}>
                FieldForce
              </div>
              <div className={`text-[10px] truncate ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                Admin · {user?.fullName || 'Administrator'}
              </div>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={toggle}
          className={`text-xs font-bold px-3.5 py-2.5 rounded-2xl shrink-0 ${ap.btnGhost}`}
        >
          {dark ? '☀ Light' : '☾ Dark'}
        </button>
      </header>

      {/* Drawer */}
      <div
        className={`fixed inset-0 z-50 ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
        aria-hidden={!open}
      >
        {/* Dim only — not full black sheet */}
        <div
          className={`absolute inset-0 transition-opacity duration-300 ${
            open ? 'opacity-100 bg-black/30' : 'opacity-0'
          }`}
          onClick={closeMenu}
        />

        {/* Narrow panel from left */}
        <aside
          className={`absolute top-0 left-0 h-full w-[min(17rem,80vw)] max-w-[300px] flex flex-col border-r ${ap.sidePanel} transition-transform duration-300 ease-out ${
            open ? 'translate-x-0' : '-translate-x-full'
          }`}
          style={open ? ap.sidePanelStyle : undefined}
        >
          <div className="p-3 flex items-center justify-between gap-2 border-b border-black/5 dark:border-white/10">
            <div className="flex items-center gap-2 min-w-0">
              <img src={logo} alt="" className="w-8 h-8 rounded-lg object-cover" />
              <div className="min-w-0">
                <div className="font-extrabold text-sm truncate">Admin</div>
                <div className={`text-[10px] ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Swipe from left edge
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={closeMenu}
              className={`rounded-lg w-8 h-8 flex items-center justify-center text-lg ${
                dark ? 'hover:bg-white/10' : 'hover:bg-black/5'
              }`}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={closeMenu}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-[13px] font-bold transition ${
                    isActive ? ap.navActive : ap.navIdle
                  }`
                }
              >
                <span className="text-sm w-5 text-center shrink-0">{item.icon}</span>
                <span className="flex-1 truncate">{item.label}</span>
                {item.to === '/admin/notifications' && unreadNotif > 0 && (
                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-red-500 text-white">
                    {unreadNotif}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="p-2 border-t border-black/5 dark:border-white/10 space-y-1.5">
            <button
              type="button"
              onClick={toggle}
              className={`w-full text-left text-xs font-bold px-3 py-2.5 rounded-2xl ${ap.btnGhost}`}
            >
              {dark ? '☀ Light mode' : '☾ Dark mode'}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className={`w-full text-left text-xs font-bold px-3 py-2.5 ${ap.btnDanger || 'rounded-2xl bg-red-500/20 text-red-300 border border-red-400/30'}`}
            >
              Log out
            </button>
          </div>
        </aside>
      </div>

      {/* Full width content on laptop */}
      <main className="flex-1 w-full max-w-[1400px] mx-auto p-4 sm:p-5 md:p-8 pb-12">
        <Outlet />
      </main>
    </div>
  );
}
