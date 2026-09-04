import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const ROLES = [
  { id: 'omr', label: 'OMR', desc: 'Open Market Rep' },
  { id: 'merchandiser', label: 'Merchandiser', desc: 'In-store execution' },
  { id: 'admin', label: 'Admin', desc: 'Management' },
];

export default function Login() {
  const [role, setRole] = useState('omr');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(username, password);
      if (data.role !== role) {
        setError(`This account is ${data.role}. Switch the role tab to match.`);
        setLoading(false);
        return;
      }
      if (data.role === 'omr') navigate('/omr');
      else if (data.role === 'merchandiser') navigate('/merch');
      else navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col ${dark ? 'bg-slate-900' : 'bg-gradient-to-br from-indigo-50 via-white to-violet-50'}`}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-5">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <span className="text-white font-bold text-sm">FF</span>
          </div>
          <span className={`font-bold text-sm ${dark ? 'text-white' : 'text-slate-800'}`}>
            FieldForce
          </span>
        </div>
        <button
          type="button"
          onClick={toggle}
          className={`text-xs px-3 py-1.5 rounded-full border font-medium ${
            dark
              ? 'border-slate-600 text-slate-300 bg-slate-800'
              : 'border-slate-200 text-slate-600 bg-white'
          }`}
        >
          {dark ? '☀ Light' : '☾ Dark'}
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center p-5">
        <div
          className={`w-full max-w-md rounded-3xl shadow-xl p-6 sm:p-8 ${
            dark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-100'
          }`}
        >
          <div className="text-center mb-6">
            <h1 className={`text-2xl font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>
              Welcome back
            </h1>
            <p className={`text-sm mt-1 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
              Sign in to continue your field day
            </p>
          </div>

          {/* Role switch */}
          <div
            className={`grid grid-cols-3 gap-1 p-1 rounded-2xl mb-6 ${
              dark ? 'bg-slate-900' : 'bg-slate-100'
            }`}
          >
            {ROLES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRole(r.id)}
                className={`py-2.5 rounded-xl text-xs font-semibold transition ${
                  role === r.id
                    ? 'bg-indigo-600 text-white shadow-md'
                    : dark
                    ? 'text-slate-400'
                    : 'text-slate-500'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <p className={`text-xs text-center mb-5 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
            {ROLES.find((r) => r.id === role)?.desc}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`w-full rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${
                  dark
                    ? 'bg-slate-900 border border-slate-600 text-white'
                    : 'bg-slate-50 border border-slate-200 text-slate-900'
                }`}
                placeholder="Enter username"
                required
                autoComplete="username"
              />
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${
                  dark
                    ? 'bg-slate-900 border border-slate-600 text-white'
                    : 'bg-slate-50 border border-slate-200 text-slate-900'
                }`}
                placeholder="Enter password"
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 text-red-500 text-sm px-4 py-3 rounded-xl border border-red-500/20">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-indigo-600/25 transition disabled:opacity-60"
            >
              {loading ? 'Signing in...' : `Sign in as ${ROLES.find((r) => r.id === role)?.label}`}
            </button>
          </form>

          <p className={`text-xs text-center mt-6 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
            FieldForce Tracker · Nivea field sales
          </p>
        </div>
      </div>
    </div>
  );
}
