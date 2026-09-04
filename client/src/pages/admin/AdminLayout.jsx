import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/admin/reports', label: 'Reports' },
    { to: '/admin/outlets', label: 'Outlets' },
    { to: '/admin/targets', label: 'Targets' },
    { to: '/admin/users', label: 'Users' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-16">
      <header className="bg-navy text-white px-4 py-3 shadow sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold">FieldForce Tracker</h1>
            <p className="text-xs text-slate-300">{user?.fullName} · Admin</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs bg-white/10 px-3 py-1.5 rounded-lg hover:bg-white/20"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg">
        <div className="flex max-w-2xl mx-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center py-3 text-xs ${
                  isActive ? 'text-navy font-semibold' : 'text-slate-400'
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
