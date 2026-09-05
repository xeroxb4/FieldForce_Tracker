import { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';

const DEFAULT = {
  gt: {
    title: 'General Trade',
    active: true,
    items: [
      { id: 1, name: 'Roll-on 6-pack bundle', status: 'active' },
      { id: 2, name: 'Top-10 SKU focus week', status: 'planned' },
      { id: 3, name: '1–2 week credit window', status: 'active' },
    ],
  },
  mt: {
    title: 'Modern Trade',
    active: true,
    items: [
      { id: 1, name: 'SOS target push', status: 'active' },
      { id: 2, name: 'End-cap display month', status: 'planned' },
      { id: 3, name: 'Secondary display photos', status: 'active' },
    ],
  },
};

function loadPromo() {
  try {
    return JSON.parse(localStorage.getItem('ff_promotions') || 'null') || DEFAULT;
  } catch {
    return DEFAULT;
  }
}

export default function AdminPromotions() {
  const { dark } = useTheme();
  const [promo, setPromo] = useState(loadPromo);
  const [tab, setTab] = useState('gt');
  const [newName, setNewName] = useState('');

  const save = (next) => {
    setPromo(next);
    localStorage.setItem('ff_promotions', JSON.stringify(next));
  };

  const channel = promo[tab];
  const card = dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-[#2596be]/40 shadow-sm';
  const inputCls = `w-full rounded-xl px-3 py-2.5 text-sm border-2 font-medium ${
    dark ? 'bg-slate-900 border-slate-600 text-white' : 'bg-white border-[#2596be]/40 text-slate-900'
  }`;

  const toggleItem = (id) => {
    const items = channel.items.map((it) =>
      it.id === id
        ? { ...it, status: it.status === 'active' ? 'paused' : 'active' }
        : it
    );
    save({ ...promo, [tab]: { ...channel, items } });
  };

  const addItem = () => {
    if (!newName.trim()) return;
    const items = [
      ...channel.items,
      { id: Date.now(), name: newName.trim(), status: 'planned' },
    ];
    save({ ...promo, [tab]: { ...channel, items } });
    setNewName('');
  };

  const removeItem = (id) => {
    const items = channel.items.filter((it) => it.id !== id);
    save({ ...promo, [tab]: { ...channel, items } });
  };

  return (
    <div className="space-y-4">
      <h1 className={`text-xl font-extrabold ${dark ? 'text-white' : 'text-slate-900'}`}>Promotions</h1>
      <p className={`text-sm font-medium ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
        Manage General Trade & Modern Trade promos
      </p>

      <div className="flex gap-2">
        {[
          { id: 'gt', label: 'General Trade' },
          { id: 'mt', label: 'Modern Trade' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold ${
              tab === t.id
                ? 'bg-[#2596be] text-white'
                : dark
                ? 'bg-slate-800 text-slate-300'
                : 'bg-white border-2 border-[#2596be]/40 text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={`rounded-2xl border-2 p-4 ${card}`}>
        <h3 className={`font-bold mb-3 ${dark ? 'text-white' : 'text-slate-900'}`}>{channel.title}</h3>
        <div className="space-y-2">
          {channel.items.map((it) => (
            <div
              key={it.id}
              className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl p-3 border ${
                dark ? 'border-slate-700' : 'border-slate-100'
              }`}
            >
              <div>
                <div className={`text-sm font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>{it.name}</div>
                <div className="text-[10px] font-bold uppercase text-[#2596be]">{it.status}</div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => toggleItem(it.id)}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg bg-[#2596be]/15 text-[#2596be]"
                >
                  {it.status === 'active' ? 'Pause' : 'Activate'}
                </button>
                <button
                  type="button"
                  onClick={() => removeItem(it.id)}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          <input
            className={inputCls}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New promotion name…"
          />
          <button
            type="button"
            onClick={addItem}
            className="px-4 py-2.5 rounded-xl bg-[#2596be] text-white text-sm font-bold shrink-0"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
