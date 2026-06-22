import { getColors, type ThemeColors, type ThemeMode } from "@okes/ui";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useColorScheme } from "react-native";
import { storage } from "./lib/storage";

const KEY = "okes.theme";

interface ThemeContextValue {
  mode: ThemeMode;
  colors: ThemeColors;
  toggle: () => void;
  setMode: (m: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const device = useColorScheme();
  const [override, setOverride] = useState<ThemeMode | null>(null);

  useEffect(() => {
    storage.get(KEY).then((v) => {
      if (v === "light" || v === "dark") setOverride(v);
    });
  }, []);

  const mode: ThemeMode = override ?? (device === "light" ? "light" : "dark");

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      colors: getColors(mode),
      setMode: (m) => { setOverride(m); void storage.set(KEY, m); },
      toggle: () => {
        const next: ThemeMode = mode === "dark" ? "light" : "dark";
        setOverride(next);
        void storage.set(KEY, next);
      },
    }),
    [mode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (ctx) return ctx;
  // Fallback before the provider mounts.
  return { mode: "dark", colors: getColors("dark"), toggle: () => {}, setMode: () => {} };
}
