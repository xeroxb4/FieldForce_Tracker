/** Lightweight SVG charts — no extra npm packages */

export function LineChart({ series = [], labels = [], height = 180, dark }) {
  const w = 320;
  const h = height;
  const pad = 28;
  const all = series.flatMap((s) => s.values);
  const max = Math.max(...all, 1);
  const n = Math.max(labels.length - 1, 1);

  const points = (values) =>
    values
      .map((v, i) => {
        const x = pad + (i / n) * (w - pad * 2);
        const y = h - pad - (v / max) * (h - pad * 2);
        return `${x},${y}`;
      })
      .join(' ');

  const colors = ['#2596be', '#f43f5e', '#10b981', '#f59e0b'];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
      {[0.25, 0.5, 0.75, 1].map((t) => {
        const y = h - pad - t * (h - pad * 2);
        return (
          <line
            key={t}
            x1={pad}
            x2={w - pad}
            y1={y}
            y2={y}
            stroke={dark ? '#334155' : '#e2e8f0'}
            strokeWidth="1"
          />
        );
      })}
      {series.map((s, si) => (
        <g key={si}>
          <polyline
            fill="none"
            stroke={colors[si % colors.length]}
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={points(s.values)}
          />
          {s.values.map((v, i) => {
            const x = pad + (i / n) * (w - pad * 2);
            const y = h - pad - (v / max) * (h - pad * 2);
            return (
              <circle key={i} cx={x} cy={y} r="3.5" fill={colors[si % colors.length]} />
            );
          })}
        </g>
      ))}
      {labels.map((lab, i) => {
        const x = pad + (i / n) * (w - pad * 2);
        return (
          <text
            key={i}
            x={x}
            y={h - 8}
            textAnchor="middle"
            fontSize="9"
            fill={dark ? '#94a3b8' : '#64748b'}
            fontWeight="600"
          >
            {lab}
          </text>
        );
      })}
    </svg>
  );
}

export function DonutChart({ slices = [], dark }) {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  const colors = ['#2596be', '#f59e0b', '#10b981', '#a78bfa', '#f43f5e'];
  let angle = -90;
  const paths = slices.map((sl, i) => {
    const portion = (sl.value / total) * 360;
    const start = angle;
    angle += portion;
    const r = 40;
    const cx = 50;
    const cy = 50;
    const rad = (d) => (d * Math.PI) / 180;
    const x1 = cx + r * Math.cos(rad(start));
    const y1 = cy + r * Math.sin(rad(start));
    const x2 = cx + r * Math.cos(rad(angle));
    const y2 = cy + r * Math.sin(rad(angle));
    const large = portion > 180 ? 1 : 0;
    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
    return <path key={i} d={d} fill={colors[i % colors.length]} />;
  });

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <svg viewBox="0 0 100 100" className="w-36 h-36">
        {paths}
        <circle cx="50" cy="50" r="22" fill={dark ? '#0f172a' : '#ffffff'} />
      </svg>
      <div className="space-y-1">
        {slices.map((sl, i) => (
          <div key={i} className="flex items-center gap-2 text-xs font-semibold">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: colors[i % colors.length] }} />
            <span className={dark ? 'text-slate-300' : 'text-slate-700'}>
              {sl.label}: {sl.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
