import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";

function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}
function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const [sx, sy] = polar(cx, cy, r, startDeg);
  const [ex, ey] = polar(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${sx} ${sy} A ${r} ${r} 0 ${large} 1 ${ex} ${ey}`;
}

/** Segmented ring — separated, rounded arc segments (one per slice). */
export function DonutChart({
  size = 172,
  stroke = 22,
  gap = 9,
  slices,
  track,
}: {
  size?: number;
  stroke?: number;
  gap?: number;
  slices: { value: number; color: string }[];
  track: string;
}) {
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const visible = slices.filter((s) => s.value > 0);
  const total = visible.reduce((s, x) => s + x.value, 0) || 1;
  const single = visible.length === 1;

  let cursor = 0;
  const segs = visible.map((s) => {
    const sweep = (s.value / total) * 360;
    const g = single ? 0 : gap;
    const start = cursor + g / 2;
    const end = cursor + sweep - g / 2;
    cursor += sweep;
    return { d: arcPath(cx, cy, r, start, Math.max(end, start + 0.01)), color: s.color };
  });

  return (
    <Svg width={size} height={size}>
      <Circle cx={cx} cy={cy} r={r} stroke={track} strokeWidth={stroke} fill="none" opacity={0.5} />
      {segs.map((seg, i) => (
        <Path key={i} d={seg.d} stroke={seg.color} strokeWidth={stroke} strokeLinecap="round" fill="none" />
      ))}
    </Svg>
  );
}

export function TrendChart({
  values,
  color,
  width,
  height = 130,
}: {
  values: number[];
  color: string;
  width: number;
  height?: number;
}) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const pad = 6;
  const h = height - pad * 2;
  const stepX = width / (values.length - 1);
  const pts = values.map((v, i) => [i * stepX, pad + h - ((v - min) / range) * h] as const);
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;
  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="trend" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0.35} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path d={area} fill="url(#trend)" />
      <Path d={line} stroke={color} strokeWidth={2.5} fill="none" />
    </Svg>
  );
}
