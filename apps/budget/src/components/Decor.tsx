import type { ReactNode } from "react";
import { View } from "react-native";
import Svg, { Circle, Path, Polygon } from "react-native-svg";

/** Concentric Adinkra-style diamonds — the Afro-futurist watermark. */
export function DiamondMotif({
  size = 130,
  color,
  opacity = 0.22,
}: {
  size?: number;
  color: string;
  opacity?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" opacity={opacity}>
      <Path d="M50 4 L96 50 L50 96 L4 50 Z" stroke={color} strokeWidth={1.5} fill="none" />
      <Path d="M50 22 L78 50 L50 78 L22 50 Z" stroke={color} strokeWidth={1.5} fill="none" />
      <Path d="M50 38 L62 50 L50 62 L38 50 Z" stroke={color} strokeWidth={1.5} fill="none" />
      <Circle cx={50} cy={50} r={4.5} fill={color} />
    </Svg>
  );
}

/** Circular progress ring with centered content. */
export function ProgressRing({
  size,
  progress,
  color,
  track,
  strokeWidth = 8,
  children,
}: {
  size: number;
  progress: number;
  color: string;
  track: string;
  strokeWidth?: number;
  children?: ReactNode;
}) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(Math.max(progress, 0), 1));
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}

/** Kente-inspired triangle weave accent. */
export function KenteRow({ colors, count = 7, tri = 7 }: { colors: string[]; count?: number; tri?: number }) {
  const step = tri + 3;
  const tris = [];
  for (let i = 0; i < count; i++) {
    const x = i * step;
    const up = i % 2 === 0;
    const points = up
      ? `${x + tri / 2},0 ${x},${tri} ${x + tri},${tri}`
      : `${x},0 ${x + tri},0 ${x + tri / 2},${tri}`;
    tris.push(<Polygon key={i} points={points} fill={colors[i % colors.length]} />);
  }
  return (
    <Svg width={count * step} height={tri}>
      {tris}
    </Svg>
  );
}
