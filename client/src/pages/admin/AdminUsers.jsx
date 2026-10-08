import { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { useAdminPremium, AdminPageHeader } from '../../lib/adminPremium';
import PremiumPicker from '../../components/PremiumPicker';

const DISTRIBUTORS = ['Amata', 'Daddy Ash', 'Daniel Adjei', 'Ernievero'];

export default function AdminUsers() {
  const { dark } = useTheme();
  const ap = useAdminPremium(dark);
  const card = ap.card;
  const cardStyle = ap.cardStyle;
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [status, setStatus] = useState(null);
  const [filterRole, setFilterRole] = useState('all'); // all | omr | merchandiser | admin
  const [distOpen, setDistOpen] = useState(false);
  const [filterDist, setFilterDist] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    username: '',
    password: '',
    fullName: '',
    role: 'omr',
    territory: '',
    distributor: '',
  });

  const inputCls = ap.input;

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (filterRole !== 'all' && u.role !== filterRole) return false;
      if (filterDist && !(u.distributor || '').toLowerCase().includes(filterDist.toLowerCase()))
        return false;
      if (q) {
        const hay = `${u.fullName} ${u.username} ${u.territory} ${u.distributor}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [users, filterRole, filterDist, search]);

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

  const deactivate = async (id, name) => {
    if (!confirm(`Deactivate ${name}? They will not be able to log in.`)) return;
    try {
      await api.delete(`/admin/users/${id}`);
      setStatus({ type: 'success', msg: 'User deactivated' });
      load();
    } catch (err) {
      setStatus({ type: 'error', msg: err.response?.data?.message || 'Failed' });
    }
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
        role: form.role,
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
    <>
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
        <div>
          <h2 className={`text-lg font-extrabold ${dark ? 'text-white' : 'text-slate-900'}`}>
            Users
          </h2>
          <p className={`text-sm font-medium ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
            Create & edit OMR / Merchandiser accounts
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowForm((s) => !s);
            setEditing(null);
            setForm({
              username: '',
              password: '',
              fullName: '',
              role: 'omr',
              territory: '',
              distributor: '',
            });
          }}
          className="px-4 py-2.5 rounded-xl text-white text-sm font-bold self-start"
        >
          {showForm ? 'Close' : '+ Add user'}
        </button>
      </div>

      {status && (
        <div
          className={`mb-3 text-sm px-3 py-2 rounded-xl font-medium ${
            status.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {status.msg}
        </div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
        <div>
          <label className={`text-xs font-bold ${dark ? 'text-slate-300' : 'text-slate-700'}`}>Role</label>
          <select
            className={inputCls}
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
          >
            <option value="all">All roles</option>
            <option value="omr">OMRs only</option>
            <option value="merchandiser">Merchandisers only</option>
            <option value="admin">Admins only</option>
          </select>
        </div>
        <div>
          <label className={`text-xs font-bold ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
            Distributor
          </label>
          <button type="button" onClick={() => setDistOpen(true)} className={inputCls + ' text-left flex justify-between'}>
            <span>{filterDist || 'All distributors'}</span>
            <span className="opacity-60">▾</span>
          </button>
        </div>
        <div>
          <label className={`text-xs font-bold ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
            Search
          </label>
          <input
            className={inputCls}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name or username…"
          />
        </div>
      </div>

      <p className={`text-xs mb-2 font-semibold ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
        Showing {filtered.length} of {users.length} user(s)
      </p>

      {(showForm || editing) && (
        <form
          onSubmit={editing ? handleUpdate : handleCreate}
          className={`rounded-[1.5rem] p-4 mb-4 space-y-3 ${
            dark ? 'admin-float border-0' : 'bg-white border-[#3F258B]/40'
          }`}
        >
          <h3 className={`font-bold text-sm ${dark ? 'text-white' : 'text-slate-900'}`}>
            {editing ? 'Edit user' : 'New user'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-bold text-slate-500">Full name</label>
              <input
                className={inputCls}
                required
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500">Username</label>
              <input
                className={inputCls}
                required
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500">
                Password {editing ? '(leave blank to keep)' : ''}
              </label>
              <input
                type="text"
                className={inputCls}
                required={!editing}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500">Role</label>
              <select
                className={inputCls}
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                disabled={!!editing}
              >
                <option value="omr">OMR</option>
                <option value="merchandiser">Merchandiser</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500">Territory</label>
              <input
                className={inputCls}
                value={form.territory}
                onChange={(e) => setForm({ ...form, territory: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500">Distributor</label>
              <select
                className={inputCls}
                value={form.distributor}
                onChange={(e) => setForm({ ...form, distributor: e.target.value })}
              >
                <option value="">—</option>
                {DISTRIBUTORS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditing(null);
              }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold ${
                dark ? 'admin-float-soft text-slate-100' : 'bg-slate-100 text-slate-700'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold"
            >
              {editing ? 'Save changes' : 'Create user'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-slate-500">No users match your filters.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((u) => (
            <div
              key={u._id}
              className={`rounded-xl border-2 p-3 flex justify-between items-start gap-2 ${
                dark ? 'admin-float-soft border-0' : 'bg-white border-[#3F258B]/30'
              }`}
            >
              <div className="min-w-0">
                <div className={`font-bold text-sm ${dark ? 'text-white' : 'text-slate-900'}`}>
                  {u.fullName}
                </div>
                <div className={`text-xs font-medium ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
                  @{u.username} · {u.role}
                </div>
                <div className={`text-xs ${dark ? 'text-slate-500' : 'text-slate-500'}`}>
                  {u.territory || '—'} · {u.distributor || '—'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => startEdit(u)}
                className={`text-xs font-bold ${dark ? "text-[#F0C38E]" : "text-[#3F258B]"} shrink-0"
              >
                Edit
              </button>
            </div>
          ))}
        </div>
      )}
    </div>

      <PremiumPicker
        open={distOpen}
        onClose={() => setDistOpen(false)}
        title="Distributor"
        options={[{ value: '', label: 'All distributors' }, ...DISTRIBUTORS.map((d) => ({ value: d, label: d }))]}
        value={filterDist}
        onChange={(v) => setFilterDist(v)}
        searchable={false}
      />
    </>
  );
}

