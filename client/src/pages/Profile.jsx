import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import UserAvatar from '../components/UserAvatar';
import api from '../services/api';

export default function Profile() {
  const { user, setUserFromProfile } = useAuth();
  const { dark } = useTheme();
  const [form, setForm] = useState({
    fullName: user?.fullName || '',
    phone: user?.phone || '',
    territory: user?.territory || '',
    password: '',
  });
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);

  const inputCls = `w-full rounded-xl px-4 py-3 text-sm border-2 font-medium ${
    dark ? 'bg-slate-900 border-slate-600 text-white' : 'bg-white border-slate-200 text-slate-900'
  }`;

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const payload = {
        fullName: form.fullName,
        phone: form.phone,
        territory: form.territory,
      };
      if (form.password) payload.password = form.password;
      const { data } = await api.put('/auth/profile', payload);
      if (setUserFromProfile) setUserFromProfile(data);
      else {
        const next = { ...user, ...data };
        localStorage.setItem('user', JSON.stringify(next));
      }
      setStatus({ type: 'success', msg: 'Profile updated' });
      setForm((f) => ({ ...f, password: '' }));
    } catch (err) {
      setStatus({ type: 'error', msg: err.response?.data?.message || 'Update failed' });
    } finally {
      setSaving(false);
    }
  };

  const home =
    user?.role === 'admin' ? '/admin' : user?.role === 'merchandiser' ? '/merch' : '/omr';

  return (
    <div className={`min-h-screen ${dark ? 'bg-slate-950' : 'bg-[#e8f4fc]'}`}>
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-4">
        <div className={`text-sm font-semibold ${dark ? 'text-slate-400' : 'text-[#2596be]'}`}>
          <Link to={home}>Home</Link>
          <span className="mx-1">/</span>
          <span className={dark ? 'text-white' : 'text-slate-800'}>User Profile</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left card */}
          <div className={`rounded-2xl p-6 shadow-sm border ${dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'}`}>
            <div className="flex flex-col items-center text-center">
              <UserAvatar size={96} editable />
              <h2 className={`mt-3 text-lg font-extrabold ${dark ? 'text-white' : 'text-slate-900'}`}>
                {user?.fullName}
              </h2>
              <p className={`text-sm capitalize ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                {user?.role}
                {user?.distributor ? ` · ${user.distributor}` : ''}
              </p>
            </div>

            <div className="mt-6 space-y-3">
              <div>
                <label className={`text-xs font-bold ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Mobile Phone</label>
                <input
                  className={inputCls}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="e.g. 024XXXXXXX"
                />
              </div>
              <div className={`rounded-xl p-3 text-sm space-y-2 ${dark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                <div className="flex justify-between">
                  <span className={dark ? 'text-slate-400' : 'text-slate-600'}>Username</span>
                  <span className="font-bold">@{user?.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className={dark ? 'text-slate-400' : 'text-slate-600'}>Territory</span>
                  <span className="font-bold">{user?.territory || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className={dark ? 'text-slate-400' : 'text-slate-600'}>Distributor</span>
                  <span className="font-bold">{user?.distributor || '—'}</span>
                </div>
              </div>
              <Link
                to={home}
                className="block text-center py-3 rounded-xl bg-[#14b8a6] text-white font-bold text-sm"
              >
                GO TO APP
              </Link>
            </div>
          </div>

          {/* Right edit form */}
          <div className={`lg:col-span-2 rounded-2xl p-6 shadow-sm border ${dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'}`}>
            <h3 className={`text-lg font-extrabold mb-4 ${dark ? 'text-white' : 'text-slate-900'}`}>
              Edit Profile
            </h3>
            {status && (
              <div
                className={`mb-3 text-sm px-3 py-2 rounded-xl font-medium ${
                  status.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}
              >
                {status.msg}
              </div>
            )}
            <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`text-xs font-bold ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Name</label>
                <input
                  className={inputCls}
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className={`text-xs font-bold ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Username</label>
                <input className={inputCls} value={user?.username || ''} disabled />
              </div>
              <div>
                <label className={`text-xs font-bold ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Territory</label>
                <input
                  className={inputCls}
                  value={form.territory}
                  onChange={(e) => setForm({ ...form, territory: e.target.value })}
                />
              </div>
              <div>
                <label className={`text-xs font-bold ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                  New password (optional)
                </label>
                <input
                  type="text"
                  className={inputCls}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Leave blank to keep"
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-8 py-3 rounded-xl bg-[#2563eb] text-white font-bold text-sm disabled:opacity-60"
                >
                  {saving ? 'Updating…' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
