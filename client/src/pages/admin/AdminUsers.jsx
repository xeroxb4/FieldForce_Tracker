import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [status, setStatus] = useState(null);
  const [form, setForm] = useState({
    username: '',
    password: '',
    fullName: '',
    role: 'omr',
    territory: '',
    distributor: '',
  });

  const load = () => {
    setLoading(true);
    api
      .get('/admin/users')
      .then((res) => setUsers(res.data))
      .catch(() => setStatus({ type: 'error', msg: 'Failed to load users' }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setStatus(null);
    try {
      await api.post('/admin/users', form);
      setStatus({ type: 'success', msg: 'User created' });
      setForm({
        username: '',
        password: '',
        fullName: '',
        role: 'omr',
        territory: '',
        distributor: '',
      });
      setShowForm(false);
      load();
    } catch (err) {
      setStatus({ type: 'error', msg: err.response?.data?.message || 'Failed' });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Users</h2>
          <p className="text-sm text-slate-500">OMRs, Merchandisers, Admins</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-navy text-white text-xs font-semibold px-3 py-2 rounded-lg"
        >
          {showForm ? 'Cancel' : '+ Add User'}
        </button>
      </div>

      {status && (
        <div
          className={`text-sm px-4 py-3 rounded-xl border mb-3 ${
            status.type === 'success'
              ? 'bg-green-50 text-green-700 border-green-200'
              : 'bg-red-50 text-red-700 border-red-200'
          }`}
        >
          {status.msg}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border rounded-xl p-4 space-y-3 mb-4">
          <input
            required
            placeholder="Full name *"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            className="w-full border rounded-xl px-4 py-3 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              required
              placeholder="Username *"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="w-full border rounded-xl px-4 py-3 text-sm"
            />
            <input
              required
              type="password"
              placeholder="Password *"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full border rounded-xl px-4 py-3 text-sm"
            />
          </div>
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="w-full border rounded-xl px-4 py-3 text-sm bg-white"
          >
            <option value="omr">OMR</option>
            <option value="merchandiser">Merchandiser</option>
            <option value="admin">Admin</option>
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="Territory"
              value={form.territory}
              onChange={(e) => setForm({ ...form, territory: e.target.value })}
              className="w-full border rounded-xl px-4 py-3 text-sm"
            />
            <input
              placeholder="Distributor"
              value={form.distributor}
              onChange={(e) => setForm({ ...form, distributor: e.target.value })}
              className="w-full border rounded-xl px-4 py-3 text-sm"
            />
          </div>
          <button type="submit" className="w-full bg-navy text-white font-semibold py-3 rounded-xl">
            Create User
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Loading...</p>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u._id} className="bg-white border border-slate-200 rounded-xl p-3">
              <div className="font-medium text-sm">{u.fullName}</div>
              <div className="text-xs text-slate-500">
                @{u.username} · {u.role}
              </div>
              <div className="text-xs text-slate-400">
                {u.territory || '—'} · {u.distributor || '—'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
