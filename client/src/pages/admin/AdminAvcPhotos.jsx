import { useEffect, useState } from 'react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { useAdminPremium, AdminPageHeader } from '../../lib/adminPremium';

export default function AdminAvcPhotos() {
  const { dark } = useTheme();
  const ap = useAdminPremium(dark);
  const [tree, setTree] = useState({});
  const [compliance, setCompliance] = useState(null);
  const [monthKey, setMonthKey] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [distributor, setDistributor] = useState('All');
  const [avcTier, setAvcTier] = useState('All');
  const [openDist, setOpenDist] = useState({});
  const [openTier, setOpenTier] = useState({});
  const [openOutlet, setOpenOutlet] = useState({});
  const [preview, setPreview] = useState(null);

  const load = () => {
    const q = new URLSearchParams({ monthKey });
    if (distributor !== 'All') q.set('distributor', distributor);
    if (avcTier !== 'All') q.set('avcTier', avcTier);
    api.get(`/avc-photos/library?${q}`).then((r) => setTree(r.data?.tree || {})).catch(() => {});
    api.get('/avc-photos/compliance').then((r) => setCompliance(r.data)).catch(() => {});
  };

  useEffect(() => {
    load();
  }, [monthKey, distributor, avcTier]);

  const card = ap.card;
  const cardStyle = ap.cardStyle;
  const dists = Object.keys(tree).sort();

  return (
    <div className="space-y-4">
      <div>
        <h1 className={`text-xl font-extrabold ${dark ? 'text-white' : 'text-slate-900'}`}>
          AVC photo library
        </h1>
        <p className={`text-sm ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
          Folder view: Distributor → AVC tier (Gold / Silver / Bronze) → Outlet → captures
        </p>
      </div>

      {compliance && (
        <div className={`rounded-2xl border p-4 ${card}`} style={cardStyle} style={cardStyle}>
          <div className={`text-sm font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>
            This period compliance ({compliance.monthKey} · period {compliance.period})
          </div>
          <div className="text-sm text-[#3F258B] font-semibold mt-1">
            {compliance.completed} / {compliance.totalAvc} AVC outlets photographed
          </div>
          {compliance.missing?.length > 0 && (
            <details className="mt-2 text-xs">
              <summary className="cursor-pointer text-amber-500 font-bold">
                {compliance.missing.length} missing
              </summary>
              <ul className={`mt-1 space-y-1 ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
                {compliance.missing.slice(0, 40).map((m) => (
                  <li key={m.outletId}>
                    {m.name} · {m.avcTier} · {m.distributor} · {m.omr}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <input
          type="month"
          value={monthKey}
          onChange={(e) => setMonthKey(e.target.value)}
          className="rounded-xl border px-3 py-2 text-sm text-slate-900"
        />
        <select
          value={distributor}
          onChange={(e) => setDistributor(e.target.value)}
          className="rounded-xl border px-3 py-2 text-sm text-slate-900"
        >
          <option>All</option>
          {['Amata', 'Daddy Ash', 'Daniel Adjei', 'Ernievero', 'Imperial'].map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
        <select
          value={avcTier}
          onChange={(e) => setAvcTier(e.target.value)}
          className="rounded-xl border px-3 py-2 text-sm text-slate-900"
        >
          <option>All</option>
          <option>Gold</option>
          <option>Silver</option>
          <option>Bronze</option>
        </select>
      </div>

      <div className="space-y-2">
        {dists.map((dist) => (
          <div key={dist} className={`rounded-2xl border ${card}`} style={cardStyle} style={cardStyle}>
            <button
              type="button"
              className={`w-full text-left px-4 py-3 font-bold ${dark ? 'text-white' : 'text-slate-900'}`}
              onClick={() => setOpenDist({ ...openDist, [dist]: !openDist[dist] })}
            >
              📁 {dist} {openDist[dist] ? '▾' : '▸'}
            </button>
            {openDist[dist] &&
              Object.keys(tree[dist] || {})
                .sort()
                .map((tier) => (
                  <div key={tier} className="pl-4 border-t border-slate-700/20">
                    <button
                      type="button"
                      className={`w-full text-left px-3 py-2 text-sm font-semibold ${
                        dark ? 'text-sky-300' : 'text-[#3F258B]'
                      }`}
                      onClick={() =>
                        setOpenTier({ ...openTier, [`${dist}-${tier}`]: !openTier[`${dist}-${tier}`] })
                      }
                    >
                      📂 AVC {tier} {openTier[`${dist}-${tier}`] ? '▾' : '▸'}
                    </button>
                    {openTier[`${dist}-${tier}`] &&
                      Object.keys(tree[dist][tier] || {}).map((outlet) => {
                        const oKey = `${dist}-${tier}-${outlet}`;
                        const captures = tree[dist][tier][outlet];
                        return (
                          <div key={outlet} className="pl-4 pb-2">
                            <button
                              type="button"
                              className={`w-full text-left px-2 py-1.5 text-sm ${
                                dark ? 'text-slate-200' : 'text-slate-800'
                              }`}
                              onClick={() => setOpenOutlet({ ...openOutlet, [oKey]: !openOutlet[oKey] })}
                            >
                              🏪 {outlet} ({captures.length}) {openOutlet[oKey] ? '▾' : '▸'}
                            </button>
                            {openOutlet[oKey] &&
                              captures.map((c) => (
                                <div
                                  key={c._id}
                                  className={`ml-2 mt-2 rounded-xl border p-2 ${
                                    dark ? 'border-slate-700' : 'border-slate-100'
                                  }`}
                                >
                                  <div className="text-[10px] text-slate-500 mb-1">
                                    {c.monthKey} · {c.periodLabel} · {c.repName}
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {(c.photos || []).map((src, i) => (
                                      <button
                                        key={i}
                                        type="button"
                                        onClick={() => setPreview(src)}
                                        className="w-20 h-20 rounded-lg overflow-hidden bg-slate-800"
                                      >
                                        <img src={src} alt="" className="w-full h-full object-cover" />
                                      </button>
                                    ))}
                                  </div>
                                  {c.notes && (
                                    <p className="text-xs mt-1 text-slate-500">{c.notes}</p>
                                  )}
                                </div>
                              ))}
                          </div>
                        );
                      })}
                  </div>
                ))}
          </div>
        ))}
        {!dists.length && (
          <p className="text-sm text-slate-500">No photos for this filter yet.</p>
        )}
      </div>

      {preview && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
        >
          <img src={preview} alt="" className="max-h-[90vh] max-w-full rounded-xl" />
        </div>
      )}
    </div>
  );
}
