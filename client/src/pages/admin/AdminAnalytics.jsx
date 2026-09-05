import { useEffect, useState } from 'react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { LineChart, DonutChart } from '../../components/Charts';

export default function AdminAnalytics() {
  const { dark } = useTheme();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/admin/dashboard').then((r) => setData(r.data)).catch(() => {});
  }, []);

  const card = dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-[#2596be]/40 shadow-sm';
  const today = data?.sales?.today?.amount || 0;
  const week = data?.sales?.week?.amount || 0;
  const month = data?.sales?.month?.amount || 0;

  // Approximate trend points for line chart (today / week avg / month avg scale)
  const lineLabels = ['Today', 'Week', 'Month'];
  const lineSeries = [
    { name: 'Sales', values: [today, week / 7, month / 30] },
    { name: 'Orders', values: [
      (data?.sales?.today?.orders || 0) * 50,
      ((data?.sales?.week?.orders || 0) / 7) * 50,
      ((data?.sales?.month?.orders || 0) / 30) * 50,
    ]},
  ];

  const distSlices = (data?.distributorMonth || []).map((d) => ({
    label: d.name,
    value: Math.round(d.total || 0),
  }));

  const insights = [];
  if (today === 0) {
    insights.push({
      type: 'gap',
      text: 'No sales recorded today.',
      action: 'Check OMR attendance and remaining beat outlets.',
    });
  }
  if ((data?.counts?.avc || 0) === 0) {
    insights.push({
      type: 'gap',
      text: 'No AVC outlets enrolled.',
      action: 'Enrol high-potential outlets under Programs → AVC.',
    });
  }
  if (data?.omrSalesToday?.[0]) {
    const top = data.omrSalesToday[0];
    insights.push({
      type: 'win',
      text: `Top OMR today: ${top.omr}`,
      action: 'Share route tactics with underperforming OMRs.',
    });
  }

  const downloadCsv = () => {
    const rows = [['OMR', 'Distributor', 'Orders', 'Amount']];
    (data?.omrSalesToday || []).forEach((r) => rows.push([r.omr, r.distributor, r.orders, r.total]));
    const blob = new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fieldforce-omr-sales-today.csv';
    a.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className={`text-xl font-extrabold ${dark ? 'text-white' : 'text-slate-900'}`}>
            Data Analysis
          </h1>
          <p className={`text-sm font-medium ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
            Line charts, mix charts, actions & downloads
          </p>
        </div>
        <button
          type="button"
          onClick={downloadCsv}
          className="text-xs font-bold px-3 py-2 rounded-xl bg-[#2596be] text-white self-start"
        >
          Download CSV
        </button>
      </div>

      <div className={`rounded-2xl border-2 p-4 ${card}`}>
        <h3 className={`font-bold mb-2 ${dark ? 'text-white' : 'text-slate-900'}`}>
          Sales trend (line)
        </h3>
        <p className={`text-[11px] mb-2 ${dark ? 'text-slate-500' : 'text-slate-500'}`}>
          Blue = sales level · Pink = order volume (scaled)
        </p>
        <LineChart series={lineSeries} labels={lineLabels} dark={dark} />
      </div>

      <div className={`rounded-2xl border-2 p-4 ${card}`}>
        <h3 className={`font-bold mb-3 ${dark ? 'text-white' : 'text-slate-900'}`}>
          Month mix by distributor
        </h3>
        {distSlices.length ? (
          <DonutChart slices={distSlices} dark={dark} />
        ) : (
          <p className="text-sm text-slate-500">No distributor sales yet this month.</p>
        )}
      </div>

      <div className={`rounded-2xl border-2 p-4 ${card}`}>
        <h3 className={`font-bold mb-3 ${dark ? 'text-white' : 'text-slate-900'}`}>
          Insights & actions
        </h3>
        <div className="space-y-2">
          {(insights.length
            ? insights
            : [{ type: 'ok', text: 'Metrics stable.', action: 'Export weekly report for review.' }]
          ).map((ins, i) => (
            <div
              key={i}
              className={`rounded-xl p-3 border text-sm ${
                ins.type === 'gap'
                  ? 'border-amber-300 bg-amber-50 text-amber-900'
                  : ins.type === 'win'
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                  : dark
                  ? 'border-slate-700 bg-slate-800 text-slate-200'
                  : 'border-slate-200 bg-slate-50 text-slate-800'
              }`}
            >
              <div className="font-bold">{ins.text}</div>
              <div className="text-xs mt-1 font-medium">Action: {ins.action}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
