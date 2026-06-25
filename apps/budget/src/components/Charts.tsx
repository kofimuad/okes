import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";

export function DonutChart({
  size = 168,
  stroke = 26,
  slices,
  track,
}: {
  size?: number;
  stroke?: number;
  slices: { value: number; color: string }[];
  track: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  let offset = 0;
  return (
    <Svg width={size} height={size}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
      {slices.map((s, i) => {
        const len = (s.value / total) * c;
        const el = (
          <Circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={s.color}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={`${len} ${c - len}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        );
        offset += len;
        return el;
      })}
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
