import { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';

function presetRange(type) {
  const today = new Date();
  const end = today.toISOString().slice(0, 10);
  if (type === 'today') return { start: end, end };
  if (type === 'week') {
    const d = new Date(today);
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1);
    return { start: d.toISOString().slice(0, 10), end };
  }
  if (type === 'month') {
    const start = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
    return { start, end };
  }
  return { start: end, end };
}

export default function AdminExport() {
  const { dark } = useTheme();
  const [startDate, setStartDate] = useState(presetRange('month').start);
  const [endDate, setEndDate] = useState(presetRange('month').end);
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState('');

  const card = dark
    ? 'bg-slate-800 border-slate-700'
    : 'bg-white border-slate-100 shadow-sm';

  const download = async (type) => {
    setError('');
    setLoading(type);
    try {
      const token = localStorage.getItem('token');
      const url = `/api/admin/export/${type}?startDate=${startDate}&endDate=${endDate}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Export failed');
      }
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download =
        type === 'omr'
          ? `OMR_Export_${startDate}_to_${endDate}.xlsx`
          : `Merch_Export_${startDate}_to_${endDate}.xlsx`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      setError(err.message || 'Export failed');
    } finally {
      setLoading(null);
    }
  };

  const applyPreset = (type) => {
    const r = presetRange(type);
    setStartDate(r.start);
    setEndDate(r.end);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className={`text-lg font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>
          Export Data
        </h2>
        <p className={`text-sm ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
          Download Excel (XLSX) reports by date range
        </p>
      </div>

      <div className={`rounded-2xl border p-4 space-y-4 ${card}`}>
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'This week' },
            { id: 'month', label: 'This month' },
          ].map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p.id)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border ${
                dark
                  ? 'border-slate-600 text-slate-300 hover:bg-slate-700'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={`block text-xs mb-1 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
              From
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={`w-full rounded-xl px-3 py-2.5 text-sm border ${
                dark
                  ? 'bg-slate-900 border-slate-600 text-white'
                  : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            />
          </div>
          <div>
            <label className={`block text-xs mb-1 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
              To
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={`w-full rounded-xl px-3 py-2.5 text-sm border ${
                dark
                  ? 'bg-slate-900 border-slate-600 text-white'
                  : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            />
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            disabled={!!loading}
            onClick={() => download('omr')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 rounded-xl disabled:opacity-60 shadow-lg shadow-indigo-600/20"
          >
            {loading === 'omr' ? 'Preparing…' : 'Download OMR Excel'}
          </button>
          <button
            type="button"
            disabled={!!loading}
            onClick={() => download('merch')}
            className={`font-semibold py-3.5 rounded-xl border disabled:opacity-60 ${
              dark
                ? 'bg-slate-900 border-slate-600 text-white'
                : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            {loading === 'merch' ? 'Preparing…' : 'Download Merchandiser Excel'}
          </button>
        </div>
      </div>

      <div className={`rounded-2xl border p-4 text-xs space-y-2 ${card}`}>
        <div className={`font-semibold ${dark ? 'text-white' : 'text-slate-800'}`}>
          OMR file includes
        </div>
        <ul className={`list-disc pl-4 space-y-1 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
          <li>Sales, visits, productive calls, productivity %, hit rate, LPPC</li>
          <li>Coverage %, top 10 count & penetration, avg top 10 penetration</li>
          <li>Avg lines per outlet, total outlets serviced</li>
          <li>Each top 10 product (Yes/No sold in range)</li>
          <li>Visit detail sheet + definitions</li>
        </ul>
        <div className={`font-semibold pt-2 ${dark ? 'text-white' : 'text-slate-800'}`}>
          Merchandiser file includes
        </div>
        <ul className={`list-disc pl-4 space-y-1 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
          <li>Visits, unique shops, SKU entries, in-stock / OOS, order qty</li>
          <li>Line-level visit detail</li>
        </ul>
      </div>
    </div>
  );
}
