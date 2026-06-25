/**
 * Okes design tokens — EXACT values from the Pencil design (nova.pen).
 * Theme-aware (dark = hero, light = "daylight").
 */

export type ThemeMode = "dark" | "light";

export interface ThemeColors {
  bgDeep: string;
  bgGradTop: string;
  bgGradBottom: string;
  surfaceGlass: string;
  surfaceGlassStrong: string;
  surfaceRaised: string;
  hairline: string;
  hairlineBright: string;
  trackBg: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  onAccent: string;
  accentCyan: string;
  accentViolet: string;
  accentMint: string;
  accentAmber: string;
  accentPink: string;
  tintTeal: string;
  tintTealStrong: string;
  tintViolet: string;
  tintGreen: string;
  tintGold: string;
  tintClay: string;
  glowViolet: string;
  glowTeal: string;
}

export const palette: Record<ThemeMode, ThemeColors> = {
  dark: {
    bgDeep: "#181A21",
    bgGradTop: "#272B37",
    bgGradBottom: "#111319",
    surfaceGlass: "#c4ccdb14",
    surfaceGlassStrong: "#cad2e224",
    surfaceRaised: "#21252F",
    hairline: "#c2cce524",
    hairlineBright: "#58bab84d",
    trackBg: "#ffffff1a",
    textPrimary: "#e7eaf0",
    textSecondary: "#9da4b3",
    textMuted: "#6a7080",
    onAccent: "#121319",
    accentCyan: "#58bab8",
    accentViolet: "#9788c9",
    accentMint: "#6cba92",
    accentAmber: "#d6ae66",
    accentPink: "#d4836e",
    tintTeal: "#58bab821",
    tintTealStrong: "#58bab833",
    tintViolet: "#9788c926",
    tintGreen: "#6cba9226",
    tintGold: "#d6ae6626",
    tintClay: "#d4836e26",
    glowViolet: "#9788c94d",
    glowTeal: "#58bab833",
  },
  // "Daylight" — warm paper, soft pastel cards, fresh-green primary (Pinterest inspo).
  light: {
    bgDeep: "#F0EDE4",
    bgGradTop: "#F7F4ED",
    bgGradBottom: "#EBE7DD",
    surfaceGlass: "#ffffffa6",
    surfaceGlassStrong: "#ffffffdb",
    surfaceRaised: "#FFFFFF",
    hairline: "#241f1417",
    hairlineBright: "#3fb37755",
    trackBg: "#1c170e12",
    textPrimary: "#1F242B",
    textSecondary: "#5d646f",
    textMuted: "#9aa0aa",
    onAccent: "#15271b",
    accentCyan: "#3fb377",
    accentViolet: "#6e97d8",
    accentMint: "#7bc86c",
    accentAmber: "#d69a4a",
    accentPink: "#e08368",
    tintTeal: "#3fb3772e",
    tintTealStrong: "#3fb37742",
    tintViolet: "#6e97d82e",
    tintGreen: "#7bc86c2e",
    tintGold: "#d69a4a2e",
    tintClay: "#e083682e",
    glowViolet: "#6e97d81f",
    glowTeal: "#3fb37724",
  },
};

export const getColors = (mode: ThemeMode): ThemeColors => palette[mode];

export const radius = { card: 24, pill: 100, sm: 12, md: 16, lg: 18 } as const;
export const spacing = { screen: 20, xs: 4, sm: 8, md: 12, lg: 16, xl: 22 } as const;

/** Space Grotesk display + Inter body — matching the Pencil design. */
export const fonts = {
  display: "SpaceGrotesk_600SemiBold",
  displayBold: "SpaceGrotesk_700Bold",
  body: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
} as const;

export const fontSize = { display: 42, h1: 24, h2: 20, section: 17, body: 14, small: 12, tiny: 11 } as const;
