import { useEffect, useState } from 'react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { useAdminPremium, AdminPageHeader } from '../../lib/adminPremium';

const GROUPS = [
  {
    region: 'Accra',
    items: [
      { name: 'Amata', notes: 'Accra sub-distributor' },
      { name: 'Daddy Ash', notes: 'Accra sub-distributor' },
    ],
  },
  {
    region: 'Kumasi',
    items: [
      { name: 'Daniel Adjei', notes: 'Kumasi sub-distributor' },
      { name: 'Ernievero', notes: 'Kumasi sub-distributor' },
    ],
  },
];

export default function AdminDistributors() {
  const { dark } = useTheme();
  const ap = useAdminPremium(dark);
  const [omrs, setOmrs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/admin/users?role=omr')
      .then((r) => setOmrs(Array.isArray(r.data) ? r.data : []))
      .catch(() => setOmrs([]))
      .finally(() => setLoading(false));
  }, []);

  const under = (name) =>
    omrs.filter((u) => {
      const d = (u.distributor || '').trim();
      if (/^nivea\s*ghana$/i.test(d)) return false;
      return d.toLowerCase().includes(name.toLowerCase());
    });

  return (
    <div className="space-y-5">
      <AdminPageHeader
        dark={dark}
        eyebrow="Network"
        title="Distributors"
        subtitle="Sub-distributors and the OMRs under them. Assign distributor on each OMR in Users."
      />

      {loading ? (
        <p className={`text-sm ${ap.muted}`}>Loading…</p>
      ) : (
        <div className="space-y-6">
          {GROUPS.map((g) => (
            <div key={g.region}>
              <p className={ap.pageEyebrow}>{g.region}</p>
              <div className="mt-2 space-y-3">
                {g.items.map((item) => {
                  const team = under(item.name);
                  return (
                    <div key={item.name} className={`${ap.card} p-4`} style={ap.cardStyle}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className={`font-black text-base ${ap.title}`}>{item.name}</h3>
                          <p className={`text-xs mt-0.5 ${ap.muted}`}>{item.notes}</p>
                        </div>
                        <span
                          className="text-[11px] font-black px-2.5 py-1 rounded-xl shrink-0"
                          style={
                            dark
                              ? {
                                  background: 'rgba(240,195,142,0.2)',
                                  color: '#F0C38E',
                                  border: '1px solid rgba(240,195,142,0.35)',
                                }
                              : {
                                  background: 'rgba(63,37,139,0.1)',
                                  color: '#3F258B',
                                }
                          }
                        >
                          {team.length} OMR{team.length === 1 ? '' : 's'}
                        </span>
                      </div>
                      <div className="mt-3 space-y-1.5">
                        {team.length === 0 ? (
                          <p className={`text-xs ${ap.soft}`}>No OMRs tagged to this distributor yet.</p>
                        ) : (
                          team.map((u) => (
                            <div
                              key={u._id}
                              className={`rounded-xl px-3 py-2 text-sm font-semibold flex justify-between gap-2 ${
                                dark ? 'bg-black/30 text-white' : 'bg-slate-50 text-slate-900'
                              }`}
                            >
                              <span className="truncate">{u.fullName}</span>
                              <span className={`text-xs font-medium shrink-0 ${ap.muted}`}>
                                {u.territory || '—'}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
