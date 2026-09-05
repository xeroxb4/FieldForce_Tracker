import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

const LINKS = [
  {
    to: '/admin/users',
    title: 'Create OMR / Merchandiser accounts',
    desc: 'Add new users: choose role (OMR or Merchandiser), username, password, territory, distributor. You can also edit passwords later.',
  },
  {
    to: '/admin/targets',
    title: 'OMR monthly targets + planned outlets',
    desc: 'Set sales target (GHS) and how many outlets each OMR should cover this month.',
  },
  {
    to: '/admin/outlets',
    title: 'Outlets & beat days',
    desc: 'Assign shops, distributors, AVC, Mon–Sat days.',
  },
  {
    to: '/admin/export',
    title: 'Exports',
    desc: 'Download XLSX reports with date ranges.',
  },
  {
    to: '/admin/reports',
    title: 'Legacy reports',
    desc: 'Visits, wrap-ups, merch tables.',
  },
];

export default function AdminSettings() {
  const { dark } = useTheme();
  return (
    <div className="space-y-4">
      <h1 className={`text-xl font-extrabold ${dark ? 'text-white' : 'text-slate-900'}`}>Settings</h1>
      <p className={`text-sm font-medium ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
        Accounts, targets, outlets and system tools
      </p>

      <div
        className={`rounded-2xl border-2 p-4 text-sm ${
          dark ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-[#e6f2f7] border-[#2596be]/40 text-slate-800'
        }`}
      >
        <div className="font-bold mb-1">How to add a new OMR or Merchandiser</div>
        <ol className="list-decimal pl-5 space-y-1 font-medium">
          <li>Open <strong>Create OMR / Merchandiser accounts</strong> below.</li>
          <li>Tap <strong>Add user</strong>.</li>
          <li>Fill full name, username, password, role (OMR or Merchandiser), territory, distributor.</li>
          <li>Save — they can log in immediately with that username/password.</li>
          <li>Assign outlets & beat days under Outlets & Beats.</li>
        </ol>
      </div>

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
