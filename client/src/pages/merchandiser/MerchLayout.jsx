import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import UserAvatar from '../../components/UserAvatar';

export default function MerchLayout() {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/merch/dashboard', label: 'Home' },
    { to: '/merch/beats', label: 'Beat' },
    { to: '/merch/visit', label: 'Visit' },
    { to: '/merch/history', label: 'History' },
  ];

  return (
    <div className={`min-h-screen flex flex-col pb-20 ${dark ? 'bg-slate-950' : 'light-page'}`}>
      <header
        className={`px-4 py-3 sticky top-0 z-10 border-b ${
          dark
            ? 'bg-slate-950/95 border-slate-800 backdrop-blur'
            : 'bg-gradient-to-r from-[#2596be] to-[#1a7a9c] border-[#1a7a9c] shadow-md'
        }`}
      >
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-2.5">
            <UserAvatar size={40} editable />
            <div>
              <h1 className={`text-sm font-bold ${dark ? 'text-white' : 'text-white'}`}>
                FieldForce
              </h1>
              <p className={`text-[10px] ${dark ? 'text-slate-400' : 'text-white/85'}`}>
                {user?.fullName} · Merchandiser
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggle}
              className={`text-[10px] px-2 py-1 rounded-lg ${
                dark ? 'bg-slate-800 text-slate-300' : 'bg-white/20 text-white'
              }`}
            >
              {dark ? '☀' : '☾'}
            </button>
            <button
              onClick={handleLogout}
              className={`text-[10px] px-2.5 py-1 rounded-lg ${
                dark ? 'bg-slate-800 text-slate-300' : 'bg-white/20 text-white'
              }`}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 max-w-lg mx-auto w-full">
        <Outlet />
      </main>

      <nav
        className={`fixed bottom-0 left-0 right-0 border-t backdrop-blur ${
          dark ? 'bg-slate-950/95 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <div className="flex max-w-lg mx-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center py-3 text-xs ${
                  isActive
                    ? 'text-teal-600 font-semibold'
                    : dark
                    ? 'text-slate-500'
                    : 'text-slate-400'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
