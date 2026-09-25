import { useEffect, useState, useMemo } from 'react';
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
          <div
            className={`text-[10px] font-bold uppercase tracking-wide ${
              isTop ? 'text-emerald-600' : 'text-amber-700'
            }`}
          >
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
          <div className={`text-[10px] ${dark ? 'text-slate-500' : 'text-slate-500'}`}>
            period sales
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 mb-2">
        <StatLine dark={dark} label="Orders" value={row.orders} />
        <StatLine dark={dark} label="Visits" value={row.visits} />
        <StatLine dark={dark} label="Hit rate" value={`${row.hitRatePct}%`} />
        <StatLine dark={dark} label="LPPC" value={row.lppc} />
        <StatLine
          dark={dark}
          label="Avg order"
          value={`GHS ${(row.avgOrderValue || 0).toLocaleString()}`}
        />
        <StatLine dark={dark} label="Shops served" value={row.shopsServed} />
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

function apiBase() {
  // Production: VITE_API_URL already ends with /api
  const env = import.meta.env.VITE_API_URL;
  if (env && String(env).trim()) return String(env).replace(/\/$/, '');
  return '/api';
}

async function downloadXlsx(pathWithQuery, filename) {
  const token = localStorage.getItem('token');
  const path = pathWithQuery.startsWith('/') ? pathWithQuery : `/${pathWithQuery}`;
  const url = `${apiBase()}${path}`;
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const ct = res.headers.get('content-type') || '';
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || `Export failed (${res.status})`);
  }
  if (ct.includes('application/json') || ct.includes('text/html')) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Server returned an error instead of Excel');
  }
  const blob = await res.blob();
  if (blob.size < 1500) {
    const text = await blob.text();
    try {
      const j = JSON.parse(text);
      throw new Error(j.message || 'Export file invalid');
    } catch (e) {
      if (e.message && !e.message.includes('JSON')) throw e;
      throw new Error('Download is not a valid Excel file. Confirm Render deployed the new API.');
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
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
  const [dlLoading, setDlLoading] = useState(false);

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

  const lineLabels = perf?.dailyTrend?.labels || [];
  const lineSeries = useMemo(() => {
    const t = perf?.dailyTrend;
    if (!t?.labels?.length) return [];
    return [
      { name: 'Sales (GHS)', values: t.sales || [] },
      { name: 'Orders', values: t.orders || [] },
      { name: 'Productive calls', values: t.productiveCalls || [] },
      { name: 'Hit rate %', values: t.hitRatePct || [] },
    ];
  }, [perf]);

  const distSlices = (data?.distributorMonth || []).map((d) => ({
    label: d.name,
    value: Math.round(d.total || 0),
  }));

  // Month-to-date / selected-period insights from ranking + trend stats
  const insights = useMemo(() => {
    const list = [];
    const avg = perf?.teamAvg;
    const top = perf?.top3?.[0];
    const bottom = perf?.bottom3?.[0];
    const trend = perf?.dailyTrend;
    const periodLabel =
      perf?.period?.startDate && perf?.period?.endDate
        ? `${perf.period.startDate} → ${perf.period.endDate}`
        : 'selected period';

    if (avg) {
      list.push({
        type: 'ok',
        text: `MTD team average: GHS ${(avg.sales || 0).toLocaleString()} sales · ${avg.hitRatePct}% hit rate · ${avg.activeOmrCount}/${avg.omrCount} OMRs active (${periodLabel}).`,
        action:
          'Use this as the floor: every OMR should aim at or above team average sales and a hit rate ≥ team average.',
      });
    }

    if (top) {
      list.push({
        type: 'win',
        text: `Top MTD: ${top.name} — GHS ${(top.sales || 0).toLocaleString()}, hit rate ${top.hitRatePct}%, LPPC ${top.lppc}, ${top.shopsServed} shops served.`,
        action: `Coach others on ${top.name}'s pattern: higher productive calls, fuller baskets (LPPC), and consistent outlet coverage—not only more visits.`,
      });
    }

    if (bottom && (!top || bottom.name !== top.name)) {
      if ((bottom.visits || 0) === 0 && (bottom.sales || 0) === 0) {
        list.push({
          type: 'gap',
          text: `Lowest MTD: ${bottom.name} has no visits/sales in this period.`,
          action:
            'Verify login/attendance, beat assignment, and device access. Set a same-day recovery plan: full beat coverage first, then productive calls.',
        });
      } else {
        list.push({
          type: 'gap',
          text: `Lowest MTD: ${bottom.name} — GHS ${(bottom.sales || 0).toLocaleString()}, hit rate ${bottom.hitRatePct}%, ${bottom.noOrderVisits || 0} no-order visits.`,
          action:
            'Focus on conversion (order vs no-order reasons), minimum lines per call, and closing credit collections before adding new low-value calls.',
        });
      }
    }

    // Trend-based guidance
    if (trend?.sales?.length >= 3) {
      const sales = trend.sales;
      const hit = trend.hitRatePct || [];
      const last3 = sales.slice(-3);
      const first3 = sales.slice(0, 3);
      const avgLast = last3.reduce((a, b) => a + b, 0) / last3.length;
      const avgFirst = first3.reduce((a, b) => a + b, 0) / Math.max(first3.length, 1);
      const avgHit =
        hit.length > 0 ? hit.reduce((a, b) => a + b, 0) / hit.length : 0;

      if (avgLast < avgFirst * 0.75 && avgFirst > 0) {
        list.push({
          type: 'gap',
          text: 'Sales trend is weaker in recent days versus the start of the period.',
          action:
            'Rebalance beats toward high-potential and AVC outlets; review no-order reasons weekly; push Top 10 SKUs on every productive call.',
        });
      } else if (avgLast > avgFirst * 1.15 && avgFirst > 0) {
        list.push({
          type: 'win',
          text: 'Sales trend is improving versus the start of the period.',
          action:
            'Lock the habits that worked: maintain coverage discipline and replicate top OMR basket mix (LPPC and Top 10) across the team.',
        });
      }

      if (avgHit > 0 && avgHit < 40) {
        list.push({
          type: 'gap',
          text: `Period average hit rate is low (~${Math.round(avgHit)}%). Many visits are not converting to orders.`,
          action:
            'Train on objection handling and stock/price talking points; require a documented no-order reason; prioritise outlets with purchase capacity / AVC potential.',
        });
      } else if (avgHit >= 55) {
        list.push({
          type: 'win',
          text: `Period average hit rate is healthy (~${Math.round(avgHit)}%).`,
          action:
            'Shift emphasis to larger drop size and Top 10 penetration while keeping coverage near 100% of daily beats.',
        });
      }
    }

    // Global guidelines (always)
    list.push({
      type: 'ok',
      text: 'Global guideline — coverage first, then conversion, then basket depth.',
      action:
        '1) Hit 100% of assigned beat outlets daily. 2) Raise hit rate (fewer empty visits). 3) Grow LPPC and Top 10 lines per order. 4) Protect credit: collect due owings before loading more credit.',
    });
    list.push({
      type: 'ok',
      text: 'Global guideline — manage the book, not only the day.',
      action:
        'Review MTD ranking weekly with each OMR. Set one numeric target (sales or hit rate). Pair lowest performers with a top performer for a joint beat day. Track AVC outlets for planogram photos and repeat orders.',
    });

    if ((data?.sales?.today?.amount || 0) === 0) {
      list.unshift({
        type: 'gap',
        text: 'No sales recorded today (live).',
        action: 'Check check-ins, GPS issues, and remaining beat outlets before end of day.',
      });
    }

    return list;
  }, [perf, data]);

  const downloadAnalysis = async () => {
    setDlLoading(true);
    setPerfError('');
    try {
      await downloadXlsx(
        `/admin/export/data-analysis?startDate=${startDate}&endDate=${endDate}`,
        `FieldForce_Data_Analysis_${startDate}_to_${endDate}.xlsx`
      );
    } catch (e) {
      setPerfError(e.message || 'Download failed');
    } finally {
      setDlLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className={`text-xl font-extrabold ${dark ? 'text-white' : 'text-slate-900'}`}>
            Data Analysis
          </h1>
          <p className={`text-sm font-medium ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
            Daily trends, top/lowest OMRs & exportable analysis
          </p>
        </div>
        <button
          type="button"
          onClick={downloadAnalysis}
          disabled={dlLoading}
          className="text-xs font-bold px-3 py-2 rounded-xl bg-emerald-600 text-white self-start disabled:opacity-60"
        >
          {dlLoading ? 'Preparing Excel…' : 'Download analysis Excel'}
        </button>
      </div>

      {/* Date + refresh shared */}
      <div className={`rounded-2xl border-2 p-3 ${card}`}>
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
        {perfError && <p className="text-sm text-red-500 mt-2">{perfError}</p>}
      </div>

      {/* Daily 4-line trend */}
      <div className={`rounded-2xl border-2 p-4 ${card}`}>
        <h3 className={`font-bold mb-1 ${dark ? 'text-white' : 'text-slate-900'}`}>
          Sales trend (daily)
        </h3>
        <p className={`text-[11px] mb-2 ${dark ? 'text-slate-500' : 'text-slate-500'}`}>
          4 lines: Sales · Orders · Productive calls · Hit rate % (each scaled to its max for shape)
        </p>
        {lineSeries.length && lineLabels.length ? (
          <LineChart series={lineSeries} labels={lineLabels} dark={dark} normalize height={260} maxLabels={7} />
        ) : (
          <p className="text-sm text-slate-500">
            {perfLoading ? 'Loading trend…' : 'No daily data for this period.'}
          </p>
        )}
      </div>

      {/* Top / Bottom 3 */}
      <div className={`rounded-2xl border-2 p-4 ${card}`}>
        <h3 className={`font-bold mb-1 ${dark ? 'text-white' : 'text-slate-900'}`}>
          OMR performance — Top 3 & Lowest 3
        </h3>
        <p className={`text-[11px] mb-3 ${dark ? 'text-slate-500' : 'text-slate-500'}`}>
          Ranked by period sales, then productive calls, then hit rate. Training accounts excluded.
        </p>

        {perf?.teamAvg && (
          <div
            className={`rounded-xl px-3 py-2 mb-3 text-xs ${
              dark ? 'bg-slate-800 text-slate-300' : 'bg-slate-50 text-slate-700'
            }`}
          >
            <span className="font-bold">Team average:</span> GHS{' '}
            {(perf.teamAvg.sales || 0).toLocaleString()} · {perf.teamAvg.hitRatePct}% hit rate ·{' '}
            {perf.teamAvg.activeOmrCount}/{perf.teamAvg.omrCount} OMRs active · {perf.period?.startDate}{' '}
            → {perf.period?.endDate}
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
        <h3 className={`font-bold mb-1 ${dark ? 'text-white' : 'text-slate-900'}`}>
          Insights & actions (month-to-date / selected period)
        </h3>
        <p className={`text-[11px] mb-3 ${dark ? 'text-slate-500' : 'text-slate-500'}`}>
          Built from ranking, hit rate, and sales trend — plus team-wide guidelines.
        </p>
        <div className="space-y-2">
          {(insights.length
            ? insights
            : [{ type: 'ok', text: 'Metrics stable.', action: 'Export analysis Excel for review.' }]
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
