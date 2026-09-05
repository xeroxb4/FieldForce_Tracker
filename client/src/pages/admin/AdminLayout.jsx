import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import logo from '../../assets/logo.png';

const NAV = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/admin/sales', label: 'Sales', icon: '💰' },
  { to: '/admin/distributors', label: 'Distributors', icon: '🏢' },
  { to: '/admin/analytics', label: 'Data Analysis', icon: '📈' },
  { to: '/admin/programs', label: 'Programs', icon: '🎯' },
  { to: '/admin/promotions', label: 'Promotions', icon: '📣' },
  { to: '/admin/outlets', label: 'Outlets & Beats', icon: '📍' },
  { to: '/admin/settings', label: 'Settings', icon: '⚙️' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const side = (
    <aside
      className={`flex flex-col h-full w-64 shrink-0 border-r ${
        dark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'
      }`}
    >
      <div className="px-4 py-4 flex items-center gap-2 border-b border-inherit">
        <img src={logo} alt="" className="w-9 h-9 rounded-xl object-contain" />
        <div>
          <div className={`font-bold text-sm ${dark ? 'text-white' : 'text-slate-900'}`}>FieldForce</div>
          <div className="text-[10px] text-[#2596be] font-semibold">Admin Panel</div>
        </div>
      </div>

      <div className={`px-4 py-3 flex items-center gap-2 border-b ${dark ? 'border-slate-800' : 'border-slate-100'}`}>
        <div className="w-9 h-9 rounded-full bg-[#2596be] text-white flex items-center justify-center text-xs font-bold">
          {(user?.fullName || 'A').slice(0, 1)}
        </div>
        <div className="min-w-0">
          <div className={`text-xs font-bold truncate ${dark ? 'text-white' : 'text-slate-900'}`}>
            {user?.fullName}
          </div>
          <div className={`text-[10px] ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Administrator</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                isActive
                  ? 'bg-[#2596be] text-white shadow-md'
                  : dark
                  ? 'text-slate-300 hover:bg-slate-800'
                  : 'text-slate-700 hover:bg-slate-100'
              }`
            }
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className={`p-3 border-t space-y-2 ${dark ? 'border-slate-800' : 'border-slate-100'}`}>
        <button
          type="button"
          onClick={toggle}
          className={`w-full text-left text-xs font-semibold px-3 py-2 rounded-lg ${
            dark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
          }`}
        >
          {dark ? '☀ Light mode' : '☾ Dark mode'}
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full text-left text-xs font-semibold px-3 py-2 rounded-lg bg-red-500/10 text-red-500"
        >
          Log out
        </button>
      </div>
    </aside>
  );

  return (
    <div className={`min-h-screen flex ${dark ? 'bg-slate-950' : 'bg-[#eef4f8]'}`}>
      {/* Desktop sidebar */}
      <div className="hidden md:flex sticky top-0 h-screen">{side}</div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative z-10 h-full">{side}</div>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header
          className={`md:hidden sticky top-0 z-10 px-4 py-3 flex items-center justify-between border-b ${
            dark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <button type="button" onClick={() => setOpen(true)} className="text-sm font-bold text-[#2596be]">
            ☰ Menu
          </button>
          <span className={`text-sm font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>Admin</span>
          <span className="w-10" />
        </header>

        <main className="flex-1 p-3 sm:p-4 md:p-6 max-w-6xl w-full mx-auto pb-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
