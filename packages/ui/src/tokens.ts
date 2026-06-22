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
  light: {
    bgDeep: "#ECE6DC",
    bgGradTop: "#F5F1E9",
    bgGradBottom: "#E0DACE",
    surfaceGlass: "#ffffff8c",
    surfaceGlassStrong: "#ffffffc4",
    surfaceRaised: "#FBF8F2",
    hairline: "#3a352c24",
    hairlineBright: "#2c9b984d",
    trackBg: "#1c1a1417",
    textPrimary: "#20222a",
    textSecondary: "#5b6070",
    textMuted: "#8c909c",
    onAccent: "#1b1812",
    accentCyan: "#268b89",
    accentViolet: "#6a57ac",
    accentMint: "#388f66",
    accentAmber: "#b3823a",
    accentPink: "#bb5d48",
    tintTeal: "#268b8924",
    tintTealStrong: "#268b8930",
    tintViolet: "#6a57ac24",
    tintGreen: "#388f6624",
    tintGold: "#b3823a24",
    tintClay: "#bb5d4824",
    glowViolet: "#9788c926",
    glowTeal: "#58bab821",
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
