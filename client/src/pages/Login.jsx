import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import logo from '../assets/logo.png';

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
    <div
      className={`min-h-screen flex flex-col relative overflow-hidden ${
        dark
          ? 'bg-slate-900'
          : 'bg-gradient-to-br from-indigo-200 via-sky-100 to-violet-200'
      }`}
    >
      {/* Soft blobs for glass effect backdrop */}
      {!dark && (
        <>
          <div className="pointer-events-none absolute -top-20 -left-20 w-72 h-72 bg-indigo-400/40 rounded-full blur-3xl" />
          <div className="pointer-events-none absolute top-1/3 -right-16 w-80 h-80 bg-violet-400/30 rounded-full blur-3xl" />
          <div className="pointer-events-none absolute bottom-10 left-1/4 w-64 h-64 bg-sky-300/40 rounded-full blur-3xl" />
        </>
      )}

      <div className="relative flex items-center justify-between px-5 pt-5">
        <div className="flex items-center gap-2">
          <img src={logo} alt="FieldForce" className="w-12 h-12 rounded-2xl object-contain" style={{ background: "transparent" }} />
          <span className={`font-bold text-sm ${dark ? 'text-white' : 'text-slate-800'}`}>
            FieldForce
          </span>
        </div>
        <button
          type="button"
          onClick={toggle}
          className={`text-xs px-3 py-1.5 rounded-full border font-medium backdrop-blur-md ${
            dark
              ? 'border-slate-600 text-slate-300 bg-slate-800/80'
              : 'border-white/50 text-slate-700 bg-white/40'
          }`}
        >
          {dark ? '☀ Light' : '☾ Dark'}
        </button>
      </div>

      <div className="relative flex-1 flex items-center justify-center p-5">
        <div
          className={`w-full max-w-md rounded-3xl p-6 sm:p-8 ${
            dark
              ? 'bg-slate-800 border border-slate-700 shadow-xl'
              : 'bg-white/45 backdrop-blur-xl border border-white/60 shadow-2xl shadow-indigo-500/10'
          }`}
        >
          <div className="text-center mb-6">
            <h1 className={`text-2xl font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>
              Welcome back
            </h1>
            <p className={`text-sm mt-1 ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
              Sign in to continue your field day
            </p>
          </div>

          <div
            className={`grid grid-cols-3 gap-1 p-1 rounded-2xl mb-6 ${
              dark ? 'bg-slate-900/80' : 'bg-white/50 border border-white/40'
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
                    : 'text-slate-600'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <p className={`text-xs text-center mb-5 ${dark ? 'text-slate-500' : 'text-slate-500'}`}>
            {ROLES.find((r) => r.id === role)?.desc}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                className={`block text-xs font-medium mb-1.5 ${
                  dark ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`w-full rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${
                  dark
                    ? 'bg-slate-900 border border-slate-600 text-white'
                    : 'bg-white/70 border border-white/80 text-slate-900 placeholder:text-slate-400'
                }`}
                placeholder="Enter username"
                required
                autoComplete="username"
              />
            </div>
            <div>
              <label
                className={`block text-xs font-medium mb-1.5 ${
                  dark ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${
                  dark
                    ? 'bg-slate-900 border border-slate-600 text-white'
                    : 'bg-white/70 border border-white/80 text-slate-900 placeholder:text-slate-400'
                }`}
                placeholder="Enter password"
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-500/20">
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

          <p className={`text-xs text-center mt-6 ${dark ? 'text-slate-500' : 'text-slate-500'}`}>
            FieldForce Tracker · Nivea field sales
          </p>
        </div>
      </div>
    </div>
  );
}
