import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

export default function AdminUsers() {
  const { dark } = useTheme();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [status, setStatus] = useState(null);
  const [form, setForm] = useState({
    username: '',
    password: '',
    fullName: '',
    role: 'omr',
    territory: '',
    distributor: '',
  });

  const inputCls = `w-full rounded-xl px-4 py-3 text-sm border ${
    dark
      ? 'bg-slate-900 border-slate-600 text-white'
      : 'bg-white border-slate-300 text-slate-900'
  }`;

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

  const startEdit = (u) => {
    setEditing(u._id);
    setForm({
      username: u.username,
      password: '',
      fullName: u.fullName,
      role: u.role,
      territory: u.territory || '',
      distributor: u.distributor || '',
    });
    setShowForm(false);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setStatus(null);
    try {
      const payload = {
        fullName: form.fullName,
        username: form.username,
        territory: form.territory,
        distributor: form.distributor,
      };
      if (form.password) payload.password = form.password;
      await api.put(`/admin/users/${editing}`, payload);
      setStatus({ type: 'success', msg: 'User updated' });
      setEditing(null);
      load();
    } catch (err) {
      setStatus({ type: 'error', msg: err.response?.data?.message || 'Failed' });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className={`text-lg font-bold ${dark ? 'text-white' : 'text-slate-800'}`}>Users</h2>
          <p className={`text-sm ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
            Create & edit usernames / passwords
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditing(null);
          }}
          className="bg-indigo-600 text-white text-xs font-semibold px-3 py-2 rounded-lg"
        >
          {showForm ? 'Cancel' : '+ Add User'}
        </button>
      </div>

      {status && (
        <div
          className={`text-sm px-4 py-3 rounded-xl border mb-3 ${
            status.type === 'success'
              ? 'bg-green-500/10 text-green-500 border-green-500/20'
              : 'bg-red-500/10 text-red-500 border-red-500/20'
          }`}
        >
          {status.msg}
        </div>
      )}

      {(showForm || editing) && (
        <form
          onSubmit={editing ? handleUpdate : handleCreate}
          className={`rounded-xl border p-4 space-y-3 mb-4 ${
            dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
          }`}
        >
          <input
            required
            placeholder="Full name *"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            className={inputCls}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              required
              placeholder="Username *"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className={inputCls}
            />
            <input
              required={!editing}
              type="password"
              placeholder={editing ? 'New password (optional)' : 'Password *'}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className={inputCls}
            />
          </div>
          {!editing && (
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className={inputCls}
            >
              <option value="omr">OMR</option>
              <option value="merchandiser">Merchandiser</option>
              <option value="admin">Admin</option>
            </select>
          )}
          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="Territory"
              value={form.territory}
              onChange={(e) => setForm({ ...form, territory: e.target.value })}
              className={inputCls}
            />
            <input
              placeholder="Distributor"
              value={form.distributor}
              onChange={(e) => setForm({ ...form, distributor: e.target.value })}
              className={inputCls}
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="flex-1 bg-indigo-600 text-white font-semibold py-3 rounded-xl">
              {editing ? 'Save changes' : 'Create User'}
            </button>
            {editing && (
              <button
                type="button"
                onClick={() => setEditing(null)}
                className={`px-4 rounded-xl border ${
                  dark ? 'border-slate-600 text-slate-300' : 'border-slate-200 text-slate-600'
                }`}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      )}

      {loading ? (
        <p className={`text-sm ${dark ? 'text-slate-400' : 'text-slate-400'}`}>Loading...</p>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <div
              key={u._id}
              className={`rounded-xl border p-3 flex justify-between items-start ${
                dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
              }`}
            >
              <div>
                <div className={`font-medium text-sm ${dark ? 'text-white' : 'text-slate-800'}`}>
                  {u.fullName}
                </div>
                <div className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                  @{u.username} · {u.role}
                </div>
                <div className={`text-xs ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
                  {u.territory || '—'} · {u.distributor || '—'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => startEdit(u)}
                className="text-xs text-indigo-500 font-medium"
              >
                Edit
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
