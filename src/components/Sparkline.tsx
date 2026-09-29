/** Tiny trend line (no axes). Tone follows direction over the window. */
export function Sparkline({ values, width = 96, height = 28, className = "" }: { values: number[]; width?: number; height?: number; className?: string }) {
  if (values.length < 2) return <svg width={width} height={height} className={className} aria-hidden />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 2;
  const pts = values.map((v, i) => [
    pad + (i / (values.length - 1)) * (width - pad * 2),
    pad + (1 - (v - min) / span) * (height - pad * 2),
  ]);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");
  const area = `${line}L${pts.at(-1)![0].toFixed(1)},${height}L${pts[0][0].toFixed(1)},${height}Z`;
  const up = values.at(-1)! >= values[0];
  const color = up ? "var(--up)" : "var(--down)";
  const id = `sp-${values.length}-${Math.round(values[0])}-${Math.round(values.at(-1)!)}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.22} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts.at(-1)![0]} cy={pts.at(-1)![1]} r={2.25} fill={color} />
    </svg>
  );
}
