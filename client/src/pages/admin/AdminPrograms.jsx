import { useEffect, useState } from 'react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

export default function AdminPrograms() {
  const { dark } = useTheme();
  const [outlets, setOutlets] = useState([]);

  useEffect(() => {
    api.get('/admin/outlets').then((r) => setOutlets(r.data || [])).catch(() => {});
  }, []);

  const avc = outlets.filter((o) => o.avcEnrolled);
  const byTier = {
    Gold: avc.filter((o) => o.avcTier === 'Gold'),
    Silver: avc.filter((o) => o.avcTier === 'Silver'),
    Bronze: avc.filter((o) => o.avcTier === 'Bronze'),
  };
  const card = dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-[#2596be]/40 shadow-sm';

  return (
    <div className="space-y-4">
      <h1 className={`text-xl font-extrabold ${dark ? 'text-white' : 'text-slate-900'}`}>Programs</h1>
      <p className={`text-sm font-medium ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
        AVC and future trade programs
      </p>

      <div className={`rounded-2xl border-2 p-4 ${card}`}>
        <h3 className={`font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>AVC Program</h3>
        <p className={`text-xs mt-1 mb-3 ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
          Gold GHS 12,500 · Silver GHS 10,000 · Bronze GHS 5,000 monthly target
        </p>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {['Gold', 'Silver', 'Bronze'].map((t) => (
            <div key={t} className={`rounded-xl p-3 text-center ${dark ? 'bg-slate-800' : 'bg-slate-50'}`}>
              <div className="text-xs font-bold text-amber-600">{t}</div>
              <div className={`text-xl font-extrabold ${dark ? 'text-white' : 'text-slate-900'}`}>
                {byTier[t].length}
              </div>
            </div>
          ))}
        </div>
        {avc.length === 0 ? (
          <p className={`text-sm ${dark ? 'text-slate-500' : 'text-slate-500'}`}>
            No AVC outlets yet. Enrol from Outlets → Edit.
          </p>
        ) : (
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {avc.map((o) => (
              <div key={o._id} className="flex justify-between text-sm gap-2">
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

      <div className={`rounded-2xl border-2 border-dashed p-4 ${dark ? 'border-slate-700' : 'border-slate-300'}`}>
        <div className={`font-bold ${dark ? 'text-slate-300' : 'text-slate-700'}`}>More programs</div>
        <p className={`text-xs mt-1 ${dark ? 'text-slate-500' : 'text-slate-500'}`}>
          Space reserved for future programs (e.g. visibility, must-stock lists). Tell us when to add one.
        </p>
      </div>
    </div>
  );
}
