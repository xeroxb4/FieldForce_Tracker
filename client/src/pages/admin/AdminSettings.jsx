import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

const LINKS = [
  { to: '/admin/users', title: 'OMR & Merchandiser accounts', desc: 'Create users, reset passwords, deactivate' },
  { to: '/admin/targets', title: 'OMR monthly targets', desc: 'Set sales targets per OMR' },
  { to: '/admin/outlets', title: 'Outlets & beat days', desc: 'Assign shops, AVC, Mon–Sat days' },
  { to: '/admin/export', title: 'Exports', desc: 'Download XLSX reports with date ranges' },
  { to: '/admin/reports', title: 'Legacy reports', desc: 'Visits, wrap-ups, merch tables' },
];

export default function AdminSettings() {
  const { dark } = useTheme();
  return (
    <div className="space-y-4">
      <h1 className={`text-xl font-extrabold ${dark ? 'text-white' : 'text-slate-900'}`}>Settings</h1>
      <p className={`text-sm font-medium ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
        Accounts, targets, outlets and system tools
      </p>
      <div className="space-y-2">
        {LINKS.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className={`block rounded-2xl border-2 p-4 transition ${
              dark
                ? 'bg-slate-900 border-slate-700 hover:border-[#2596be]'
                : 'bg-white border-[#2596be]/40 shadow-sm hover:border-[#2596be]'
            }`}
          >
            <div className={`font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>{l.title}</div>
            <div className={`text-xs mt-0.5 ${dark ? 'text-slate-400' : 'text-slate-600'}`}>{l.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
