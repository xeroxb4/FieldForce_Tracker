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

function apiBase() {
  // Production: VITE_API_URL = https://fieldforce-tracker.onrender.com/api
  // Local: empty → use /api proxy
  const env = import.meta.env.VITE_API_URL;
  if (env && String(env).trim()) return String(env).replace(/\/$/, '');
  return '/api';
}

async function downloadXlsx(pathWithQuery, filename) {
  const token = localStorage.getItem('token');
  const url = `${apiBase()}${pathWithQuery.startsWith('/') ? '' : '/'}${pathWithQuery}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const ct = res.headers.get('content-type') || '';
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || `Export failed (${res.status})`);
  }
  // Reject HTML/JSON mistaken for Excel
  if (ct.includes('application/json') || ct.includes('text/html')) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Server returned an error instead of Excel');
  }
  const blob = await res.blob();
  if (blob.size < 2000) {
    // likely error body
    const text = await blob.text();
    try {
      const j = JSON.parse(text);
      throw new Error(j.message || 'Export file too small / invalid');
    } catch (e) {
      if (e.message && !e.message.includes('JSON')) throw e;
      throw new Error('Download is not a valid Excel file. Check API URL and login.');
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
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

  const run = async (type) => {
    setError('');
    setLoading(type);
    try {
      if (type === 'productivity') {
        await downloadXlsx(
          `/admin/export/productivity?startDate=${startDate}&endDate=${endDate}`,
          `FieldForce_Productivity_${startDate}_to_${endDate}.xlsx`
        );
      } else if (type === 'omr') {
        await downloadXlsx(
          `/admin/export/omr?startDate=${startDate}&endDate=${endDate}`,
          `OMR_Export_${startDate}_to_${endDate}.xlsx`
        );
      } else {
        await downloadXlsx(
          `/admin/export/merch?startDate=${startDate}&endDate=${endDate}`,
          `Merch_Export_${startDate}_to_${endDate}.xlsx`
        );
      }
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
          Download Excel (XLSX) reports by date range — same style as GH Productivity Report
        </p>
      </div>

      <div className={`rounded-2xl border p-4 space-y-4 ${card}`}>
        <div className="flex flex-wrap gap-2">
          {['today', 'week', 'month'].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => applyPreset(p)}
              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-[#2596be]/15 text-[#2596be]"
            >
              {p}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={`text-xs font-semibold ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
              Start
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full mt-1 rounded-xl border px-3 py-2 text-sm text-slate-900"
            />
          </div>
          <div>
            <label className={`text-xs font-semibold ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
              End
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full mt-1 rounded-xl border px-3 py-2 text-sm text-slate-900"
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-500 font-medium">{error}</p>
        )}

        <button
          type="button"
          disabled={!!loading}
          onClick={() => run('productivity')}
          className="w-full py-3 rounded-xl bg-[#2596be] text-white font-bold text-sm disabled:opacity-60"
        >
          {loading === 'productivity' ? 'Preparing…' : 'Download productivity workbook (GH style)'}
        </button>
        <button
          type="button"
          disabled={!!loading}
          onClick={() => run('omr')}
          className="w-full py-3 rounded-xl border border-[#2596be] text-[#2596be] font-bold text-sm disabled:opacity-60"
        >
          {loading === 'omr' ? 'Preparing…' : 'Download OMR detail export'}
        </button>
        <button
          type="button"
          disabled={!!loading}
          onClick={() => run('merch')}
          className="w-full py-3 rounded-xl border border-slate-300 text-slate-700 font-bold text-sm disabled:opacity-60"
        >
          {loading === 'merch' ? 'Preparing…' : 'Download Merchandiser export'}
        </button>
      </div>

      <div className={`rounded-2xl border p-4 text-sm ${card}`}>
        <div className={`font-semibold mb-2 ${dark ? 'text-white' : 'text-slate-800'}`}>
          Productivity workbook includes
        </div>
        <ul className={`list-disc pl-4 space-y-1 ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
          <li>
            <strong>Regional</strong> — coverage planned/visited, coverage %, hit rate, LPPC,
            outlet/day, target, actual sales, achievement % (Excel formulas)
          </li>
          <li>
            <strong>Distributor</strong> — per OMR with comments (below run-rate / on track)
          </li>
          <li>
            <strong>Target</strong> — distributor / OMR target list
          </li>
        </ul>
      </div>
    </div>
  );
}
