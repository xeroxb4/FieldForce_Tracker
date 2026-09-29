import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
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
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unreadNotif, setUnreadNotif] = useState(0);

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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const closeMenu = () => setOpen(false);

  const glassPanel = dark
    ? 'bg-slate-950/75 border-white/10 text-white backdrop-blur-2xl'
    : 'bg-white/70 border-white/40 text-slate-900 backdrop-blur-2xl shadow-2xl shadow-slate-900/10';

  return (
    <div className={`min-h-screen flex flex-col ${dark ? 'bg-slate-950' : 'bg-[#e8f1f6]'}`}>
      {/* Top bar — menu always available */}
      <header
        className={`sticky top-0 z-40 flex items-center justify-between gap-3 px-3 sm:px-4 py-2.5 border-b ${
          dark
            ? 'bg-slate-950/80 border-slate-800/80 backdrop-blur-xl'
            : 'bg-white/80 border-slate-200/80 backdrop-blur-xl'
        }`}
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={`shrink-0 relative inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition ${
              dark
                ? 'bg-white/10 text-white hover:bg-white/15 border border-white/10'
                : 'bg-[#117ea6]/10 text-[#117ea6] hover:bg-[#117ea6]/15 border border-[#117ea6]/20'
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
          className={`text-xs font-semibold px-3 py-2 rounded-xl shrink-0 ${
            dark ? 'bg-white/10 text-slate-200' : 'bg-slate-100 text-slate-700'
          }`}
        >
          {dark ? '☀ Light' : '☾ Dark'}
        </button>
      </header>

      {/* Slide-over glassy menu (left → right) */}
      <div
        className={`fixed inset-0 z-50 transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden={!open}
      >
        <button
          type="button"
          className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
          onClick={closeMenu}
          aria-label="Close menu"
        />
        <aside
          className={`absolute top-0 left-0 h-full w-[min(20rem,88vw)] flex flex-col border-r ${glassPanel} transition-transform duration-300 ease-out ${
            open ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="p-4 flex items-center justify-between gap-2 border-b border-white/10">
            <div className="flex items-center gap-2 min-w-0">
              <img src={logo} alt="" className="w-9 h-9 rounded-xl object-cover shadow" />
              <div className="min-w-0">
                <div className="font-extrabold text-sm truncate">Admin panel</div>
                <div className={`text-[10px] truncate ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Slide menu
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={closeMenu}
              className={`rounded-lg px-2 py-1 text-lg leading-none ${
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
                  `flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                    isActive
                      ? 'bg-[#117ea6] text-white shadow-lg shadow-[#117ea6]/30'
                      : dark
                      ? 'text-slate-200 hover:bg-white/10'
                      : 'text-slate-700 hover:bg-white/60'
                  }`
                }
              >
                <span className="text-base w-6 text-center">{item.icon}</span>
                <span className="flex-1 truncate">{item.label}</span>
                {item.to === '/admin/notifications' && unreadNotif > 0 && (
                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-red-500 text-white">
                    {unreadNotif}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          <div className={`p-3 border-t border-white/10 space-y-2`}>
            <button
              type="button"
              onClick={() => {
                toggle();
              }}
              className={`w-full text-left text-xs font-semibold px-3 py-2.5 rounded-xl ${
                dark ? 'bg-white/10 text-slate-200' : 'bg-white/50 text-slate-700'
              }`}
            >
              {dark ? '☀ Light mode' : '☾ Dark mode'}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full text-left text-xs font-semibold px-3 py-2.5 rounded-xl bg-red-500/15 text-red-500"
            >
              Log out
            </button>
          </div>
        </aside>
      </div>

      <main className="flex-1 p-3 sm:p-4 md:p-6 max-w-6xl w-full mx-auto pb-10">
        <Outlet />
      </main>
    </div>
  );
}
