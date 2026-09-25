/** Lightweight SVG charts — no extra npm packages */

export function LineChart({
  series = [],
  labels = [],
  height = 200,
  dark,
  normalize = false,
  maxLabels = 8,
}) {
  const w = 360;
  const h = height;
  const padL = 36;
  const padR = 12;
  const padT = 12;
  const padB = 36;
  const colors = ['#2596be', '#f43f5e', '#10b981', '#f59e0b', '#a78bfa'];

  const prepared = series.map((s) => {
    const vals = s.values || [];
    const max = Math.max(...vals, 1);
    const drawn = normalize ? vals.map((v) => (v / max) * 100) : vals;
    return { ...s, drawn, rawMax: max };
  });

  const all = prepared.flatMap((s) => s.drawn);
  const max = Math.max(...all, 1);
  const n = Math.max(labels.length - 1, 1);

  const points = (values) =>
    values
      .map((v, i) => {
        const x = padL + (i / n) * (w - padL - padR);
        const y = h - padB - (v / max) * (h - padT - padB);
        return `${x},${y}`;
      })
      .join(' ');

  const labelStep = Math.max(1, Math.ceil(labels.length / maxLabels));

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
        {[0.25, 0.5, 0.75, 1].map((t) => {
          const y = h - padB - t * (h - padT - padB);
          return (
            <line
              key={t}
              x1={padL}
              x2={w - padR}
              y1={y}
              y2={y}
              stroke={dark ? '#334155' : '#e2e8f0'}
              strokeWidth="1"
            />
          );
        })}
        {prepared.map((s, si) => (
          <g key={si}>
            <polyline
              fill="none"
              stroke={colors[si % colors.length]}
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={points(s.drawn)}
            />
            {s.drawn.map((v, i) => {
              if (labels.length > 14 && i % labelStep !== 0 && i !== s.drawn.length - 1) return null;
              const x = padL + (i / n) * (w - padL - padR);
              const y = h - padB - (v / max) * (h - padT - padB);
              return <circle key={i} cx={x} cy={y} r="2.8" fill={colors[si % colors.length]} />;
            })}
          </g>
        ))}
        {labels.map((lab, i) => {
          if (i % labelStep !== 0 && i !== labels.length - 1) return null;
          const x = padL + (i / n) * (w - padL - padR);
          const short =
            String(lab).length > 6 && labels.length > 10
              ? String(lab).slice(5) // show MM-DD style if YYYY-MM-DD
              : lab;
          return (
            <text
              key={i}
              x={x}
              y={h - 10}
              textAnchor="middle"
              fontSize="8"
              fill={dark ? '#94a3b8' : '#64748b'}
              fontWeight="600"
            >
              {short}
            </text>
          );
        })}
      </svg>
      <div className="flex flex-wrap gap-3 mt-1 px-1">
        {series.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[10px] font-semibold">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: colors[i % colors.length] }}
            />
            <span className={dark ? 'text-slate-300' : 'text-slate-700'}>{s.name}</span>
          </div>
        ))}
      </div>
      {normalize && (
        <p className={`text-[10px] mt-1 ${dark ? 'text-slate-500' : 'text-slate-500'}`}>
          Each line scaled to its own max so shapes are comparable (sales vs % hit rate).
        </p>
      )}
    </div>
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
