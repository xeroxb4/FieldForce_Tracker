import { useEffect, useState } from 'react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

const CATEGORIES = ['Roll-on', 'Spray', 'Lotion', 'Shower Gel', 'Body Care', 'Other'];

const empty = {
  name: '',
  skuCode: '',
  category: 'Lotion',
  size: '',
  pricePc: '',
  pricePack: '',
  priceCarton: '',
  unitsPerPack: '6',
  unitsPerCarton: '12',
};

export default function AdminProducts() {
  const { dark } = useTheme();
  const [list, setList] = useState([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const inputCls = `w-full rounded-xl px-3 py-2.5 text-sm border-2 font-medium ${
    dark ? 'bg-slate-900 border-slate-600 text-white' : 'bg-white border-[#2596be]/40 text-slate-900'
  }`;
  const card = dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-[#2596be]/40 shadow-sm';

  const load = () => {
    setLoading(true);
    api
      .get('/admin/products')
      .then((r) => setList(r.data || []))
      .catch(() => setStatus({ type: 'error', msg: 'Failed to load products' }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setStatus(null);
    try {
      const payload = {
        ...form,
        pricePc: Number(form.pricePc) || 0,
        pricePack: Number(form.pricePack) || 0,
        priceCarton: Number(form.priceCarton) || 0,
        unitsPerPack: Number(form.unitsPerPack) || 6,
        unitsPerCarton: Number(form.unitsPerCarton) || 12,
      };
      if (editing) {
        await api.put(`/admin/products/${editing}`, payload);
        setStatus({ type: 'success', msg: 'Product updated' });
      } else {
        await api.post('/admin/products', payload);
        setStatus({ type: 'success', msg: 'Product created' });
      }
      setForm(empty);
      setEditing(null);
      load();
    } catch (err) {
      setStatus({ type: 'error', msg: err.response?.data?.message || 'Save failed' });
    }
  };

  const startEdit = (p) => {
    setEditing(p._id);
    setForm({
      name: p.name || '',
      skuCode: p.skuCode || '',
      category: p.category || 'Lotion',
      size: p.size || '',
      pricePc: String(p.pricePc ?? ''),
      pricePack: String(p.pricePack ?? ''),
      priceCarton: String(p.priceCarton ?? ''),
      unitsPerPack: String(p.unitsPerPack ?? 6),
      unitsPerCarton: String(p.unitsPerCarton ?? 12),
    });
  };

  const remove = async (id) => {
    if (!confirm('Deactivate this product?')) return;
    await api.delete(`/admin/products/${id}`);
    load();
  };

  return (
    <div className="space-y-4">
      <h1 className={`text-xl font-extrabold ${dark ? 'text-white' : 'text-slate-900'}`}>Products</h1>
      <p className={`text-sm font-medium ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
        Add / edit SKUs and prices used by OMRs and merchandisers
      </p>

      {status && (
        <div
          className={`text-sm px-3 py-2 rounded-xl font-medium ${
            status.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {status.msg}
        </div>
      )}

      <form onSubmit={save} className={`rounded-2xl border-2 p-4 space-y-3 ${card}`}>
        <h3 className={`font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>
          {editing ? 'Edit product' : 'New product'}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input className={inputCls} required placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className={inputCls} required placeholder="SKU code *" value={form.skuCode} onChange={(e) => setForm({ ...form, skuCode: e.target.value })} />
          <select className={inputCls} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input className={inputCls} placeholder="Size (e.g. 400ml, 250ml)" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} />
          <input className={inputCls} type="number" step="0.01" placeholder="Price PC (GHS)" value={form.pricePc} onChange={(e) => setForm({ ...form, pricePc: e.target.value })} />
          <input className={inputCls} type="number" step="0.01" placeholder="Price Pack (GHS)" value={form.pricePack} onChange={(e) => setForm({ ...form, pricePack: e.target.value })} />
          <input className={inputCls} type="number" step="0.01" placeholder="Price Carton (GHS)" value={form.priceCarton} onChange={(e) => setForm({ ...form, priceCarton: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <input className={inputCls} type="number" placeholder="Units/pack" value={form.unitsPerPack} onChange={(e) => setForm({ ...form, unitsPerPack: e.target.value })} />
            <input className={inputCls} type="number" placeholder="Units/carton" value={form.unitsPerCarton} onChange={(e) => setForm({ ...form, unitsPerCarton: e.target.value })} />
          </div>
        </div>
        <div className="flex gap-2">
          {editing && (
            <button type="button" onClick={() => { setEditing(null); setForm(empty); }} className="flex-1 py-2.5 rounded-xl bg-slate-100 font-bold text-sm">
              Cancel
            </button>
          )}
          <button type="submit" className="flex-1 py-2.5 rounded-xl bg-[#2596be] text-white font-bold text-sm">
            {editing ? 'Save changes' : 'Add product'}
          </button>
        </div>
      </form>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <div className="space-y-2">
          {list.map((p) => (
            <div key={p._id} className={`rounded-2xl border-2 p-3 ${card} ${!p.isActive ? 'opacity-50' : ''}`}>
              <div className="flex justify-between gap-2">
                <div>
                  <div className={`font-bold text-sm ${dark ? 'text-white' : 'text-slate-900'}`}>{p.name}</div>
                  <div className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {p.skuCode} · {p.category} {p.size ? `· ${p.size}` : ''} · PC {p.pricePc} / Pack {p.pricePack} / Ctn {p.priceCarton}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button type="button" onClick={() => startEdit(p)} className="text-xs font-bold text-[#2596be]">Edit</button>
                  {p.isActive && (
                    <button type="button" onClick={() => remove(p._id)} className="text-xs font-bold text-red-500">Remove</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
