import type { PublicUser } from "@okes/core";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "../lib/api";
import { storage } from "../lib/storage";

const ACCESS_KEY = "okes.access";
const REFRESH_KEY = "okes.refresh";

type Status = "loading" | "authed" | "guest";

interface AuthContextValue {
  status: Status;
  user: PublicUser | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function persist(access: string, refresh: string) {
  await storage.set(ACCESS_KEY, access);
  await storage.set(REFRESH_KEY, refresh);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUser] = useState<PublicUser | null>(null);

  // Bootstrap: restore a saved session if possible.
  useEffect(() => {
    (async () => {
      const access = await storage.get(ACCESS_KEY);
      const refresh = await storage.get(REFRESH_KEY);
      if (!access || !refresh) {
        setStatus("guest");
        return;
      }
      api.setTokens(access, refresh);
      try {
        const { user } = await api.me();
        setUser(user);
        setStatus("authed");
      } catch {
        try {
          const t = await api.refresh();
          await persist(t.accessToken, t.refreshToken);
          const { user } = await api.me();
          setUser(user);
          setStatus("authed");
        } catch {
          api.setTokens(null, null);
          await storage.del(ACCESS_KEY);
          await storage.del(REFRESH_KEY);
          setStatus("guest");
        }
      }
    })();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      async login(email, password) {
        const r = await api.login(email, password);
        await persist(r.accessToken, r.refreshToken);
        setUser(r.user);
        setStatus("authed");
      },
      async register(email, password, name) {
        const r = await api.register(email, password, name);
        await persist(r.accessToken, r.refreshToken);
        setUser(r.user);
        setStatus("authed");
      },
      async logout() {
        api.setTokens(null, null);
        await storage.del(ACCESS_KEY);
        await storage.del(REFRESH_KEY);
        setUser(null);
        setStatus("guest");
      },
    }),
    [status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
