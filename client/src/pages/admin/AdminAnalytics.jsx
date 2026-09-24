import { useEffect, useState } from 'react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { LineChart, DonutChart } from '../../components/Charts';

function monthBounds() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const end = now.toISOString().slice(0, 10);
  return { start, end };
}

function StatLine({ label, value, dark }) {
  return (
    <div className="flex justify-between gap-2 text-xs">
      <span className={dark ? 'text-slate-400' : 'text-slate-500'}>{label}</span>
      <span className={`font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>{value}</span>
    </div>
  );
}

function RankCard({ row, variant, dark }) {
  const isTop = variant === 'top';
  return (
    <div
      className={`rounded-xl border-2 p-3 ${
        isTop
          ? dark
            ? 'border-emerald-500/50 bg-emerald-950/30'
            : 'border-emerald-300 bg-emerald-50'
          : dark
          ? 'border-amber-500/40 bg-amber-950/20'
          : 'border-amber-300 bg-amber-50'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <div className={`text-[10px] font-bold uppercase tracking-wide ${isTop ? 'text-emerald-600' : 'text-amber-700'}`}>
            #{row.rank} {isTop ? 'Top performer' : 'Needs attention'}
          </div>
          <div className={`font-extrabold text-sm ${dark ? 'text-white' : 'text-slate-900'}`}>
            {row.name}
          </div>
          <div className={`text-[11px] ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
            {row.distributor || '—'} · {row.territory || '—'}
          </div>
        </div>
        <div className="text-right">
          <div className={`text-lg font-black ${isTop ? 'text-emerald-600' : 'text-amber-700'}`}>
            GHS {(row.sales || 0).toLocaleString()}
          </div>
          <div className={`text-[10px] ${dark ? 'text-slate-500' : 'text-slate-500'}`}>period sales</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 mb-2">
        <StatLine dark={dark} label="Orders" value={row.orders} />
        <StatLine dark={dark} label="Visits" value={row.visits} />
        <StatLine dark={dark} label="Hit rate" value={`${row.hitRatePct}%`} />
        <StatLine dark={dark} label="LPPC" value={row.lppc} />
        <StatLine dark={dark} label="Avg order" value={`GHS ${(row.avgOrderValue || 0).toLocaleString()}`} />
        <StatLine dark={dark} label="Shops served" value={row.shopsServed} />
        <StatLine dark={dark} label="Attendance days" value={row.attendanceDays} />
        <StatLine dark={dark} label="Outlets assigned" value={row.outletsAssigned} />
      </div>
      <div className={`text-xs font-bold mb-1 ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
        Statistical notes
      </div>
      <ul className={`text-xs space-y-1 list-disc pl-4 ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
        {(row.analysis || []).map((a, i) => (
          <li key={i}>{a}</li>
        ))}
      </ul>
    </div>
  );
}

export default function AdminAnalytics() {
  const { dark } = useTheme();
  const [data, setData] = useState(null);
  const bounds = monthBounds();
  const [startDate, setStartDate] = useState(bounds.start);
  const [endDate, setEndDate] = useState(bounds.end);
  const [perf, setPerf] = useState(null);
  const [perfLoading, setPerfLoading] = useState(false);
  const [perfError, setPerfError] = useState('');

  useEffect(() => {
    api.get('/admin/dashboard').then((r) => setData(r.data)).catch(() => {});
  }, []);

  const loadPerf = () => {
    setPerfLoading(true);
    setPerfError('');
    api
      .get(`/admin/performance-ranking?startDate=${startDate}&endDate=${endDate}`)
      .then((r) => setPerf(r.data))
      .catch(() => setPerfError('Failed to load performance ranking'))
      .finally(() => setPerfLoading(false));
  };

  useEffect(() => {
    loadPerf();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const card = dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-[#2596be]/40 shadow-sm';
  const today = data?.sales?.today?.amount || 0;
  const week = data?.sales?.week?.amount || 0;
  const month = data?.sales?.month?.amount || 0;

  const lineLabels = ['Today', 'Week', 'Month'];
  const lineSeries = [
    { name: 'Sales', values: [today, week / 7, month / 30] },
    {
      name: 'Orders',
      values: [
        (data?.sales?.today?.orders || 0) * 50,
        ((data?.sales?.week?.orders || 0) / 7) * 50,
        ((data?.sales?.month?.orders || 0) / 30) * 50,
      ],
    },
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
    (data?.omrSalesToday || []).forEach((r) =>
      rows.push([r.omr, r.distributor, r.orders, r.total])
    );
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
            Performance ranking, charts & insights
          </p>
        </div>
        <button
          type="button"
          onClick={downloadCsv}
          className="text-xs font-bold px-3 py-2 rounded-xl bg-[#2596be] text-white self-start"
        >
          Download CSV (today)
        </button>
      </div>

      {/* Top / Bottom 3 */}
      <div className={`rounded-2xl border-2 p-4 ${card}`}>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-3">
          <div>
            <h3 className={`font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>
              OMR performance — Top 3 & Lowest 3
            </h3>
            <p className={`text-[11px] mt-0.5 ${dark ? 'text-slate-500' : 'text-slate-500'}`}>
              Ranked by period sales (GHS), then productive calls, then hit rate. Training accounts excluded.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label className={`text-[10px] font-bold ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
                From
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="block mt-0.5 rounded-lg border px-2 py-1.5 text-xs text-slate-900"
              />
            </div>
            <div>
              <label className={`text-[10px] font-bold ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
                To
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="block mt-0.5 rounded-lg border px-2 py-1.5 text-xs text-slate-900"
              />
            </div>
            <button
              type="button"
              onClick={loadPerf}
              disabled={perfLoading}
              className="text-xs font-bold px-3 py-2 rounded-xl bg-[#117ea6] text-white disabled:opacity-60"
            >
              {perfLoading ? 'Loading…' : 'Refresh'}
            </button>
          </div>
        </div>

        {perfError && <p className="text-sm text-red-500 mb-2">{perfError}</p>}

        {perf?.teamAvg && (
          <div
            className={`rounded-xl px-3 py-2 mb-3 text-xs ${
              dark ? 'bg-slate-800 text-slate-300' : 'bg-slate-50 text-slate-700'
            }`}
          >
            <span className="font-bold">Team average (period):</span> GHS{' '}
            {(perf.teamAvg.sales || 0).toLocaleString()} sales · {perf.teamAvg.hitRatePct}% hit rate ·{' '}
            {perf.teamAvg.activeOmrCount}/{perf.teamAvg.omrCount} OMRs with activity ·{' '}
            {perf.period?.startDate} → {perf.period?.endDate}
          </div>
        )}

        {perfLoading && !perf ? (
          <p className="text-sm text-slate-500">Loading ranking…</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="text-xs font-extrabold uppercase tracking-wide text-emerald-600">
                Top 3 performing
              </h4>
              {(perf?.top3 || []).length === 0 ? (
                <p className="text-sm text-slate-500">No data for this period.</p>
              ) : (
                perf.top3.map((r) => <RankCard key={r.name} row={r} variant="top" dark={dark} />)
              )}
            </div>
            <div className="space-y-2">
              <h4 className="text-xs font-extrabold uppercase tracking-wide text-amber-700">
                Lowest 3 performing
              </h4>
              {(perf?.bottom3 || []).length === 0 ? (
                <p className="text-sm text-slate-500">No data for this period.</p>
              ) : (
                perf.bottom3.map((r) => (
                  <RankCard key={r.name + '-b'} row={r} variant="bottom" dark={dark} />
                ))
              )}
            </div>
          </div>
        )}
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
