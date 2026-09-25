/** Lightweight SVG charts — no extra npm packages */

export function LineChart({
  series = [],
  labels = [],
  height = 240,
  dark,
  normalize = false,
  maxLabels = 8,
}) {
  // Wide viewBox so the plot uses the full card width (not a small centered strip)
  const w = 640;
  const h = height;
  const padL = 48;
  const padR = 28;
  const padT = 16;
  const padB = 36;
  const colors = ['#2596be', '#f43f5e', '#10b981', '#f59e0b', '#a78bfa'];

  const prepared = series.map((s) => {
    const vals = (s.values || []).map((v) => Number(v) || 0);
    const max = Math.max(...vals, 1);
    const drawn = normalize ? vals.map((v) => (v / max) * 100) : vals;
    return { ...s, values: vals, drawn, rawMax: max };
  });

  const all = prepared.flatMap((s) => s.drawn);
  const max = Math.max(...all, 1);
  const nPts = Math.max(labels.length, 1);
  const n = Math.max(nPts - 1, 1);

  const xAt = (i) => padL + (i / n) * (w - padL - padR);
  const yAt = (v) => h - padB - (v / max) * (h - padT - padB);

  const points = (values) => values.map((v, i) => `${xAt(i)},${yAt(v)}`).join(' ');

  const labelStep = Math.max(1, Math.ceil(labels.length / maxLabels));
  const yTicks = [0, 0.25, 0.5, 0.75, 1];

  const formatY = (t) => {
    if (normalize) return `${Math.round(t * 100)}`;
    const v = t * max;
    if (v >= 1000) return `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`;
    return String(Math.round(v));
  };

  return (
    <div className="w-full">
      {/*
        width 100% + no max-height: avoids letterboxing that left huge empty side margins
      */}
      <svg
        viewBox={`0 0 ${w} ${h}`}
        width="100%"
        className="block w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
        style={{ maxHeight: height + 40 }}
      >
        {yTicks.map((t) => {
          const y = yAt(t * max);
          return (
            <g key={t}>
              <line
                x1={padL}
                x2={w - padR}
                y1={y}
                y2={y}
                stroke={dark ? '#334155' : '#e2e8f0'}
                strokeWidth="1"
              />
              <text
                x={padL - 6}
                y={y + 3}
                textAnchor="end"
                fontSize="11"
                fill={dark ? '#94a3b8' : '#64748b'}
                fontWeight="600"
              >
                {formatY(t)}
              </text>
            </g>
          );
        })}

        <text
          x={14}
          y={h / 2}
          textAnchor="middle"
          fontSize="10"
          fill={dark ? '#64748b' : '#94a3b8'}
          fontWeight="700"
          transform={`rotate(-90 14 ${h / 2})`}
        >
          {normalize ? 'Scaled 0–100' : 'Value'}
        </text>

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
              if (labels.length > 14 && i % labelStep !== 0 && i !== s.drawn.length - 1) {
                return null;
              }
              return (
                <circle
                  key={i}
                  cx={xAt(i)}
                  cy={yAt(v)}
                  r="3"
                  fill={colors[si % colors.length]}
                />
              );
            })}
          </g>
        ))}

        {labels.map((lab, i) => {
          if (i % labelStep !== 0 && i !== labels.length - 1) return null;
          const raw = String(lab);
          const short =
            raw.length >= 10 && raw.includes('-') ? raw.slice(5) : raw.slice(0, 6);
          return (
            <text
              key={i}
              x={xAt(i)}
              y={h - 12}
              textAnchor="middle"
              fontSize="10"
              fill={dark ? '#94a3b8' : '#64748b'}
              fontWeight="600"
            >
              {short}
            </text>
          );
        })}
      </svg>

      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
        {series.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[11px] font-semibold">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: colors[i % colors.length] }}
            />
            <span className={dark ? 'text-slate-300' : 'text-slate-700'}>{s.name}</span>
          </div>
        ))}
      </div>
      {normalize && (
        <p className={`text-[10px] mt-1.5 leading-snug ${dark ? 'text-slate-500' : 'text-slate-500'}`}>
          Y-axis scaled 0–100 per line (each metric vs its own max). Excel download has real values.
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
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: colors[i % colors.length] }}
            />
            <span className={dark ? 'text-slate-300' : 'text-slate-700'}>
              {sl.label}: {sl.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
