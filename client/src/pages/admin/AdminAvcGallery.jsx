import { useEffect, useState } from 'react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

const TIERS = ['Gold', 'Silver', 'Bronze', 'Unspecified'];

export default function AdminAvcGallery() {
  const { dark } = useTheme();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [period, setPeriod] = useState('');
  const [tree, setTree] = useState({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState({}); // dist-tier keys
  const [preview, setPreview] = useState(null);

  const load = () => {
    setLoading(true);
    const q = new URLSearchParams({ year, month });
    if (period) q.set('period', period);
    api
      .get(`/admin/avc-photos?${q}`)
      .then((r) => {
        setTree(r.data?.tree || {});
        setTotal(r.data?.total || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [year, month, period]);

  const deletePhoto = async (id) => {
    if (!id) return;
    if (!window.confirm('Delete this AVC photo? The OMR can capture again for this half-month.')) return;
    try {
      await api.delete(`/admin/avc-photos/${id}`);
      setPreview(null);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  const card = dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200';

  return (
    <div className="space-y-4">
      <div>
        <h1 className={`text-xl font-extrabold ${dark ? 'text-white' : 'text-slate-900'}`}>
          AVC photo folder
        </h1>
        <p className={`text-sm ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
          Shelf / planogram captures from OMRs — by distributor and AVC tier
        </p>
      </div>

      <div className={`rounded-2xl border p-3 flex flex-wrap gap-2 items-end ${card}`}>
        <label className="text-xs">
          Month
          <input
            type="number"
            min={1}
            max={12}
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="block mt-1 w-20 rounded-lg border px-2 py-1.5 text-sm text-slate-900"
          />
        </label>
        <label className="text-xs">
          Year
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="block mt-1 w-24 rounded-lg border px-2 py-1.5 text-sm text-slate-900"
          />
        </label>
        <label className="text-xs">
          Period
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="block mt-1 rounded-lg border px-2 py-1.5 text-sm text-slate-900"
          >
            <option value="">All half-months</option>
            <option value="1">1st half (1–15)</option>
            <option value="2">2nd half (16–end)</option>
          </select>
        </label>
        <span className="text-sm font-bold text-[#2596be] ml-auto">{total} photo(s)</span>
      </div>

      {loading && <p className="text-sm text-slate-500">Loading…</p>}

      {Object.keys(tree).length === 0 && !loading && (
        <p className={`text-sm ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
          No AVC photos for this period yet.
        </p>
      )}

      {Object.entries(tree).map(([dist, tiers]) => (
        <div key={dist} className={`rounded-2xl border overflow-hidden ${card}`}>
          <div className={`px-4 py-3 font-extrabold text-[#2596be] border-b ${dark ? 'border-slate-700' : 'border-slate-100'}`}>
            📁 {dist}
          </div>
          {TIERS.map((tier) => {
            const list = tiers[tier] || [];
            if (!list.length) return null;
            const key = `${dist}-${tier}`;
            const isOpen = open[key] !== false; // default open
            return (
              <div key={tier} className={`border-t ${dark ? 'border-slate-800' : 'border-slate-50'}`}>
                <button
                  type="button"
                  onClick={() => setOpen((o) => ({ ...o, [key]: !isOpen }))}
                  className={`w-full text-left px-4 py-2 text-sm font-bold flex justify-between ${
                    dark ? 'text-slate-200' : 'text-slate-800'
                  }`}
                >
                  <span>
                    📂 {tier}{' '}
                    <span className="text-xs font-normal opacity-60">({list.length})</span>
                  </span>
                  <span className="text-xs opacity-50">{isOpen ? '▼' : '▶'}</span>
                </button>
                {isOpen && (
                  <div className="px-3 pb-3 grid grid-cols-2 md:grid-cols-3 gap-2">
                    {list.map((p) => (
                      <button
                        key={p._id}
                        type="button"
                        onClick={() => setPreview(p)}
                        className={`rounded-xl border overflow-hidden text-left ${
                          dark ? 'border-slate-700' : 'border-slate-200'
                        }`}
                      >
                        <img src={p.photo} alt="" className="w-full h-28 object-cover" />
                        <div className="p-2">
                          <div className={`text-xs font-bold truncate ${dark ? 'text-white' : 'text-slate-900'}`}>
                            {p.shopName}
                          </div>
                          <div className="text-[10px] opacity-60">
                            {p.periodLabel} · {p.omr}
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deletePhoto(p._id);
                            }}
                            className="mt-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-red-500/15 text-red-400 border border-red-500/30"
                          >
                            Delete · retake
                          </button>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {preview && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className={`max-w-lg w-full rounded-2xl overflow-hidden ${dark ? 'bg-slate-900' : 'bg-white'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <img src={preview.photo} alt="" className="w-full max-h-[70vh] object-contain bg-black" />
            <div className="p-4">
              <div className={`font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>{preview.shopName}</div>
              <div className="text-xs opacity-70">
                {preview.distributor} · AVC {preview.avcTier} · {preview.periodLabel}
              </div>
              <div className="text-xs opacity-70">{preview.omr}</div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="py-2 rounded-xl bg-red-500/15 text-red-400 border border-red-500/30 font-bold text-sm"
                  onClick={() => deletePhoto(preview._id)}
                >
                  Delete · retake
                </button>
                <button
                  type="button"
                  className="py-2 rounded-xl bg-[#2596be] text-white font-bold text-sm"
                  onClick={() => setPreview(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
