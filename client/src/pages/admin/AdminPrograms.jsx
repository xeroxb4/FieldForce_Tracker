import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

export default function AdminPrograms() {
  const { dark } = useTheme();
  const [outlets, setOutlets] = useState([]);
  const [filterTier, setFilterTier] = useState('');
  const [notes, setNotes] = useState(() => localStorage.getItem('ff_program_notes') || '');

  useEffect(() => {
    api.get('/admin/outlets').then((r) => setOutlets(r.data || [])).catch(() => {});
  }, []);

  const avc = outlets.filter((o) => o.avcEnrolled);
  const shown = filterTier ? avc.filter((o) => o.avcTier === filterTier) : avc;
  const byTier = {
    Gold: avc.filter((o) => o.avcTier === 'Gold').length,
    Silver: avc.filter((o) => o.avcTier === 'Silver').length,
    Bronze: avc.filter((o) => o.avcTier === 'Bronze').length,
  };
  const card = dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-[#2596be]/40 shadow-sm';
  const inputCls = `w-full rounded-xl px-3 py-2.5 text-sm border-2 font-medium ${
    dark ? 'bg-slate-900 border-slate-600 text-white' : 'bg-white border-[#2596be]/40 text-slate-900'
  }`;

  return (
    <div className="space-y-4">
      <h1 className={`text-xl font-extrabold ${dark ? 'text-white' : 'text-slate-900'}`}>Programs</h1>
      <p className={`text-sm font-medium ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
        Manage AVC membership — enrol/remove from Outlets edit
      </p>

      <div className="grid grid-cols-3 gap-2">
        {['Gold', 'Silver', 'Bronze'].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setFilterTier(filterTier === t ? '' : t)}
            className={`rounded-xl p-3 text-center border-2 transition ${
              filterTier === t
                ? 'border-amber-500 bg-amber-50'
                : dark
                ? 'border-slate-700 bg-slate-900'
                : 'border-slate-200 bg-white'
            }`}
          >
            <div className="text-xs font-bold text-amber-600">{t}</div>
            <div className={`text-xl font-extrabold ${dark ? 'text-white' : 'text-slate-900'}`}>
              {byTier[t]}
            </div>
          </button>
        ))}
      </div>

      <div className={`rounded-2xl border-2 p-4 ${card}`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
          <h3 className={`font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>
            AVC outlets {filterTier ? `· ${filterTier}` : ''}
          </h3>
          <Link to="/admin/outlets" className="text-xs font-bold text-[#2596be]">
            Enrol / edit in Outlets →
          </Link>
        </div>
        {shown.length === 0 ? (
          <p className="text-sm text-slate-500">No AVC outlets in this view.</p>
        ) : (
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {shown.map((o) => (
              <div key={o._id} className="flex justify-between text-sm gap-2 py-1">
                <span className={`font-semibold ${dark ? 'text-white' : 'text-slate-900'}`}>
                  {o.displayName || o.name}
                </span>
                <span className="text-xs font-bold text-amber-600 shrink-0">
                  {o.avcTier} · {o.assignedTo?.fullName || '—'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={`rounded-2xl border-2 p-4 ${card}`}>
        <h3 className={`font-bold mb-2 ${dark ? 'text-white' : 'text-slate-900'}`}>Program notes</h3>
        <textarea
          className={inputCls}
          rows={3}
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            localStorage.setItem('ff_program_notes', e.target.value);
          }}
          placeholder="Campaign notes, launch dates, focus SKUs…"
        />
        <p className="text-[10px] text-slate-500 mt-1">Saved on this device.</p>
      </div>
    </div>
  );
}
