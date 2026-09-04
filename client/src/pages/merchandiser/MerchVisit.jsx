import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

const SOS_CATEGORIES = [
  'Roll-on',
  'Body Care',
  'Spray',
  'Shower',
  'Face Care',
  'Face Cleansing',
  'Men Care',
  'Lip Care',
];

const emptySos = () =>
  SOS_CATEGORIES.map((category) => ({
    category,
    numberOfBrands: '',
    totalCategoryFacings: '',
    niveaFacings: '',
  }));

function calcRow(row) {
  const brands = Number(row.numberOfBrands) || 0;
  const total = Number(row.totalCategoryFacings) || 0;
  const nivea = Number(row.niveaFacings) || 0;
  const sosPct = total > 0 ? Math.round((nivea / total) * 1000) / 10 : 0;
  const expectedSharePct = brands > 0 ? Math.round((100 / brands) * 10) / 10 : 0;
  const shelfAdvantage =
    expectedSharePct > 0 ? Math.round((sosPct / expectedSharePct) * 100) / 100 : 0;
  return { sosPct, expectedSharePct, shelfAdvantage };
}

export default function MerchVisit() {
  const { dark } = useTheme();
  const fileRef = useRef(null);
  const [shopName, setShopName] = useState('');
  const [visitType, setVisitType] = useState('Merchandising Visit');
  const [tab, setTab] = useState('sos'); // sos | photos | notes
  const [sosRows, setSosRows] = useState(emptySos);
  const [photos, setPhotos] = useState([]);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const inputCls = `w-full rounded-xl px-3 py-2.5 text-sm border outline-none focus:ring-2 focus:ring-indigo-500 ${
    dark
      ? 'bg-slate-900 border-slate-600 text-white placeholder:text-slate-500'
      : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
  }`;
  const labelCls = `block text-xs font-medium mb-1 ${dark ? 'text-slate-300' : 'text-slate-600'}`;
  const cardCls = `rounded-2xl border p-3 ${
    dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
  }`;

  const updateSos = (idx, field, value) => {
    setSosRows((rows) =>
      rows.map((r, i) => (i === idx ? { ...r, [field]: value } : r))
    );
  };

  const onPickPhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (photos.length >= 8) {
      setStatus({ type: 'error', msg: 'Maximum 8 photos per visit' });
      return;
    }
    // Compress via canvas
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxW = 1280;
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const url = canvas.toDataURL('image/jpeg', 0.7);
        setPhotos((p) => [
          ...p,
          { url, caption: '', category: '', takenAt: new Date().toISOString() },
        ]);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!shopName.trim()) {
      setStatus({ type: 'error', msg: 'Shop name is required' });
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      const payloadRows = sosRows
        .filter(
          (r) =>
            r.numberOfBrands || r.totalCategoryFacings || r.niveaFacings
        )
        .map((r) => ({
          category: r.category,
          numberOfBrands: Number(r.numberOfBrands) || 0,
          totalCategoryFacings: Number(r.totalCategoryFacings) || 0,
          niveaFacings: Number(r.niveaFacings) || 0,
        }));

      await api.post('/merchandiser/visits', {
        shopName,
        visitType,
        date: new Date().toISOString().slice(0, 10),
        sosRows: payloadRows,
        photos,
        overallNotes: notes,
        status: 'completed',
        startedAt: new Date().toISOString(),
      });
      setStatus({ type: 'success', msg: 'Visit saved with Share of Shelf data' });
      setShopName('');
      setSosRows(emptySos());
      setPhotos([]);
      setNotes('');
    } catch (err) {
      setStatus({ type: 'error', msg: err.response?.data?.message || 'Failed to save' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className={`text-lg font-bold mb-1 ${dark ? 'text-white' : 'text-slate-800'}`}>
        Merchandising Visit
      </h2>
      <p className={`text-sm mb-4 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
        Share of Shelf · photos · notes
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls}>Shop / Outlet *</label>
          <input
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            className={inputCls}
            placeholder="Store name"
            required
          />
        </div>

        <div>
          <label className={labelCls}>Visit type</label>
          <select
            value={visitType}
            onChange={(e) => setVisitType(e.target.value)}
            className={inputCls}
          >
            <option>Merchandising Visit</option>
            <option>Store Audit</option>
            <option>Planogram Check</option>
            <option>Complete Audit</option>
            <option>Other</option>
          </select>
        </div>

        {/* Tabs */}
        <div
          className={`flex gap-1 p-1 rounded-xl ${dark ? 'bg-slate-800' : 'bg-slate-100'}`}
        >
          {[
            { id: 'sos', label: 'Share of Shelf' },
            { id: 'photos', label: 'Photos' },
            { id: 'notes', label: 'Notes' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold ${
                tab === t.id
                  ? 'bg-indigo-600 text-white'
                  : dark
                  ? 'text-slate-400'
                  : 'text-slate-500'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'sos' && (
          <div className="space-y-3">
            <p className={`text-[11px] ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
              SOS % = NIVEA facings ÷ total category facings × 100. Expected share = 100 ÷ brands.
              Shelf advantage = SOS ÷ expected share.
            </p>
            {sosRows.map((row, idx) => {
              const c = calcRow(row);
              return (
                <div key={row.category} className={cardCls}>
                  <div className={`text-sm font-semibold mb-2 ${dark ? 'text-white' : 'text-slate-800'}`}>
                    {row.category}
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <div>
                      <label className={labelCls}># Brands</label>
                      <input
                        type="number"
                        min="0"
                        value={row.numberOfBrands}
                        onChange={(e) => updateSos(idx, 'numberOfBrands', e.target.value)}
                        className={inputCls}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Total facings</label>
                      <input
                        type="number"
                        min="0"
                        value={row.totalCategoryFacings}
                        onChange={(e) => updateSos(idx, 'totalCategoryFacings', e.target.value)}
                        className={inputCls}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className={labelCls}>NIVEA facings</label>
                      <input
                        type="number"
                        min="0"
                        value={row.niveaFacings}
                        onChange={(e) => updateSos(idx, 'niveaFacings', e.target.value)}
                        className={inputCls}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className={`rounded-lg py-1.5 ${dark ? 'bg-slate-900' : 'bg-indigo-50'}`}>
                      <div className="text-[9px] text-indigo-500">SOS %</div>
                      <div className={`text-sm font-bold ${dark ? 'text-white' : 'text-slate-800'}`}>
                        {c.sosPct}
                      </div>
                    </div>
                    <div className={`rounded-lg py-1.5 ${dark ? 'bg-slate-900' : 'bg-slate-50'}`}>
                      <div className={`text-[9px] ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Expected %
                      </div>
                      <div className={`text-sm font-bold ${dark ? 'text-white' : 'text-slate-800'}`}>
                        {c.expectedSharePct}
                      </div>
                    </div>
                    <div className={`rounded-lg py-1.5 ${dark ? 'bg-slate-900' : 'bg-emerald-50'}`}>
                      <div className="text-[9px] text-emerald-500">Advantage</div>
                      <div className={`text-sm font-bold ${dark ? 'text-white' : 'text-slate-800'}`}>
                        {c.shelfAdvantage}x
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'photos' && (
          <div className="space-y-3">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={onPickPhoto}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full py-3 rounded-xl border-2 border-dashed border-indigo-400 text-indigo-500 text-sm font-semibold"
            >
              📷 Take / upload shelf photo
            </button>
            {photos.length === 0 ? (
              <p className={`text-sm text-center ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
                No photos yet. Capture the shelf for SOS evidence.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {photos.map((ph, i) => (
                  <div key={i} className="relative rounded-xl overflow-hidden">
                    <img src={ph.url} alt="" className="w-full h-28 object-cover" />
                    <button
                      type="button"
                      onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                      className="absolute top-1 right-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'notes' && (
          <div>
            <label className={labelCls}>Overall notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className={inputCls}
              placeholder="Observations, competitor activity, action points…"
            />
          </div>
        )}

        {status && (
          <div
            className={`text-sm px-4 py-3 rounded-xl border ${
              status.type === 'success'
                ? 'bg-green-500/10 text-green-500 border-green-500/20'
                : 'bg-red-500/10 text-red-500 border-red-500/20'
            }`}
          >
            {status.msg}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white font-semibold py-3.5 rounded-xl disabled:opacity-60"
        >
          {loading ? 'Saving...' : 'Complete visit'}
        </button>
      </form>
    </div>
  );
}
