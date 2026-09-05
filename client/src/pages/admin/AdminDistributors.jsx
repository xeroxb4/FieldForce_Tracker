import { useEffect, useState } from 'react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

const STRUCTURE = [
  {
    region: 'Accra',
    subs: [
      { name: 'Amata', notes: 'Accra sub-distributor' },
      { name: 'Daddy Ash', notes: 'Accra sub-distributor' },
    ],
  },
  {
    region: 'Kumasi',
    subs: [
      { name: 'Daniel Adjei', notes: 'Kumasi sub-distributor' },
      { name: 'Ernievero', notes: 'Kumasi sub-distributor' },
    ],
  },
];

export default function AdminDistributors() {
  const { dark } = useTheme();
  const [omrs, setOmrs] = useState([]);

  useEffect(() => {
    api.get('/admin/users?role=omr').then((r) => setOmrs(r.data || [])).catch(() => {});
  }, []);

  const card = dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-[#2596be]/40 shadow-sm';

  const under = (name) =>
    omrs.filter((u) => (u.distributor || '').toLowerCase().includes(name.toLowerCase()));

  return (
    <div className="space-y-4">
      <h1 className={`text-xl font-extrabold ${dark ? 'text-white' : 'text-slate-900'}`}>
        Distributors
      </h1>
      <p className={`text-sm font-medium ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
        Sub-distributors and the OMRs under them. Assign distributor on each OMR in Settings → Users.
      </p>

      {STRUCTURE.map((region) => (
        <div key={region.region} className="space-y-3">
          <h2 className={`text-sm font-extrabold uppercase tracking-wide text-[#2596be]`}>
            {region.region}
          </h2>
          <div className="grid md:grid-cols-2 gap-3">
            {region.subs.map((sub) => {
              const list = under(sub.name);
              return (
                <div key={sub.name} className={`rounded-2xl border-2 p-4 ${card}`}>
                  <div className={`font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>{sub.name}</div>
                  <div className={`text-xs mb-3 ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {sub.notes} · {list.length} OMR(s)
                  </div>
                  {list.length === 0 ? (
                    <p className={`text-xs ${dark ? 'text-slate-500' : 'text-slate-500'}`}>
                      No OMRs tagged to this distributor yet.
                    </p>
                  ) : (
                    <ul className="space-y-1">
                      {list.map((u) => (
                        <li
                          key={u._id}
                          className={`text-sm font-semibold ${dark ? 'text-slate-200' : 'text-slate-800'}`}
                        >
                          • {u.fullName}
                          <span className={`font-normal ${dark ? 'text-slate-500' : 'text-slate-500'}`}>
                            {' '}
                            · {u.territory || '—'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
