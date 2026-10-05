import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import UserAvatar from '../components/UserAvatar';
import api from '../services/api';
import { usePremium, PremiumHero } from '../lib/premium';

export default function Profile() {
  const { user, setUserFromProfile } = useAuth();
  const { dark } = useTheme();
  const p = usePremium(dark);
  const [form, setForm] = useState({
    fullName: user?.fullName || '',
    phone: user?.phone || '',
    territory: user?.territory || '',
    password: '',
  });
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);

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
    <div className={`min-h-screen ${p.shell}`}>
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-4">
        <div className={`text-sm font-semibold ${p.soft}`}>
          <Link to={home} className="text-[#3F258B] dark:text-violet-300">
            Home
          </Link>
          <span className="mx-1">/</span>
          <span className={p.title}>User Profile</span>
        </div>

        <PremiumHero
          dark={dark}
          eyebrow="Account"
          title="Profile"
          subtitle={`${user?.fullName || ''} · ${user?.role || ''}`}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left identity card — 3D */}
          <div className={`p-6 ${p.card3d}`} style={p.card3dStyle}>
            <div className="flex flex-col items-center text-center">
              <UserAvatar size={96} editable />
              <h2 className={`mt-3 text-lg font-extrabold ${p.title}`}>{user?.fullName}</h2>
              <p className={`text-sm capitalize ${p.soft}`}>
                {user?.role}
                {user?.distributor ? ` · ${user.distributor}` : ''}
              </p>
            </div>

            <div className="mt-6 space-y-3">
              <div>
                <label className={p.label}>Mobile Phone</label>
                <input
                  className={p.input}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="e.g. 024XXXXXXX"
                />
              </div>
              <div
                className={`rounded-2xl p-3.5 text-sm space-y-2 ${
                  dark ? 'bg-slate-950/70 border border-white/8' : 'bg-slate-50 border border-slate-200'
                }`}
              >
                <div className="flex justify-between">
                  <span className={p.soft}>Username</span>
                  <span className={`font-bold ${p.title}`}>@{user?.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className={p.soft}>Territory</span>
                  <span className={`font-bold ${p.title}`}>{user?.territory || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className={p.soft}>Distributor</span>
                  <span className={`font-bold ${p.title}`}>{user?.distributor || '—'}</span>
                </div>
              </div>
              <Link
                to={home}
                className={`block text-center ${p.btnPrimary}`}
                style={p.btnPrimaryStyle}
              >
                GO TO APP
              </Link>
            </div>
          </div>

          {/* Right edit form — 3D */}
          <div className={`lg:col-span-2 p-6 ${p.card3d}`} style={p.card3dStyle}>
            <h3 className={`text-lg font-extrabold mb-4 ${p.title}`}>Edit Profile</h3>
            {status && (
              <div
                className={`mb-3 text-sm px-3 py-2.5 rounded-2xl font-medium border ${
                  status.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-red-50 text-red-700 border-red-200'
                }`}
              >
                {status.msg}
              </div>
            )}
            <form onSubmit={save} className="space-y-4">
              <div>
                <label className={p.label}>Full name</label>
                <input
                  className={p.input}
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                />
              </div>
              <div>
                <label className={p.label}>Territory</label>
                <input
                  className={p.input}
                  value={form.territory}
                  onChange={(e) => setForm({ ...form, territory: e.target.value })}
                />
              </div>
              <div>
                <label className={p.label}>New password (optional)</label>
                <input
                  type="password"
                  className={p.input}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Leave blank to keep current"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className={`w-full ${p.btnPrimary}`}
                style={p.btnPrimaryStyle}
              >
                {saving ? 'Saving…' : 'Save profile'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
