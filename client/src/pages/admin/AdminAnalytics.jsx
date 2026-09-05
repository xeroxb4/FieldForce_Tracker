import { useEffect, useState } from 'react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

export default function AdminAnalytics() {
  const { dark } = useTheme();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/admin/dashboard').then((r) => setData(r.data)).catch(() => {});
  }, []);

  const card = dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-[#2596be]/40 shadow-sm';
  const month = data?.sales?.month?.amount || 0;
  const week = data?.sales?.week?.amount || 0;
  const today = data?.sales?.today?.amount || 0;
  const maxBar = Math.max(month, week, today, 1);

  const insights = [];
  if (today === 0) {
    insights.push({
      type: 'gap',
      text: 'No sales recorded today. Check OMR attendance and beat coverage.',
      action: 'Review attendance and push morning check-in.',
    });
  }
  if ((data?.counts?.avc || 0) === 0) {
    insights.push({
      type: 'gap',
      text: 'No AVC outlets enrolled yet.',
      action: 'Identify high-potential outlets and enrol Gold/Silver/Bronze.',
    });
  }
  if ((data?.omrSalesToday || []).length > 0) {
    const top = data.omrSalesToday[0];
    insights.push({
      type: 'win',
      text: `Top OMR today: ${top.omr} (${Number(top.total).toLocaleString()} GHS).`,
      action: 'Share best practices from this route with lower performers.',
    });
  }
  if (week > 0 && today < week / 6) {
    insights.push({
      type: 'gap',
      text: 'Today is tracking below average daily run-rate for the week.',
      action: 'Focus remaining beat outlets on top-10 SKUs and credit follow-ups.',
    });
  }
  if (!insights.length) {
    insights.push({
      type: 'ok',
      text: 'Metrics look stable. Keep monitoring coverage and hit rate.',
      action: 'Export weekly report for leadership review.',
    });
  }

  const downloadCsv = () => {
    const rows = [['OMR', 'Distributor', 'Orders', 'Amount']];
    (data?.omrSalesToday || []).forEach((r) => {
      rows.push([r.omr, r.distributor, r.orders, r.total]);
    });
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fieldforce-omr-sales-today.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className={`text-xl font-extrabold ${dark ? 'text-white' : 'text-slate-900'}`}>
            Data Analysis
          </h1>
          <p className={`text-sm font-medium ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
            Charts, interpretations, actions & downloads
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={downloadCsv}
            className="text-xs font-bold px-3 py-2 rounded-xl border-2 border-[#2596be] text-[#2596be]"
          >
            CSV today
          </button>
          <a
            href="/api/admin/export/omr"
            className="text-xs font-bold px-3 py-2 rounded-xl bg-[#2596be] text-white"
            onClick={async (e) => {
              e.preventDefault();
              try {
                const res = await api.get('/admin/export/omr', { responseType: 'blob' });
                const url = URL.createObjectURL(res.data);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'omr-export.xlsx';
                a.click();
              } catch {
                alert('Export failed — check date range on Export page');
              }
            }}
          >
            Full XLSX
          </a>
        </div>
      </div>

      <div className={`rounded-2xl border-2 p-4 ${card}`}>
        <h3 className={`font-bold mb-4 ${dark ? 'text-white' : 'text-slate-900'}`}>Sales comparison</h3>
        {[
          ['Today', today, 'bg-rose-400'],
          ['This week', week, 'bg-sky-500'],
          ['This month', month, 'bg-teal-500'],
        ].map(([label, val, color]) => (
          <div key={label} className="mb-3">
            <div className="flex justify-between text-xs font-bold mb-1">
              <span className={dark ? 'text-slate-300' : 'text-slate-700'}>{label}</span>
              <span className={dark ? 'text-white' : 'text-slate-900'}>
                GHS {Number(val).toLocaleString()}
              </span>
            </div>
            <div className={`h-3 rounded-full ${dark ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <div
                className={`h-3 rounded-full ${color}`}
                style={{ width: `${Math.max(4, (val / maxBar) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className={`rounded-2xl border-2 p-4 ${card}`}>
        <h3 className={`font-bold mb-3 ${dark ? 'text-white' : 'text-slate-900'}`}>
          Insights & recommended actions
        </h3>
        <div className="space-y-2">
          {insights.map((ins, i) => (
            <div
              key={i}
              className={`rounded-xl p-3 border ${
                ins.type === 'gap'
                  ? 'border-amber-300 bg-amber-50 text-amber-900'
                  : ins.type === 'win'
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                  : dark
                  ? 'border-slate-700 bg-slate-800 text-slate-200'
                  : 'border-slate-200 bg-slate-50 text-slate-800'
              }`}
            >
              <div className="text-sm font-bold">{ins.text}</div>
              <div className="text-xs mt-1 font-medium opacity-90">Action: {ins.action}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
