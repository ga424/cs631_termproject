import { createContext, useContext, useMemo, useState } from "react";
import { api } from "../lib/api";
import {
  clearStoredAuthSession,
  clearStoredCustomerPortalId,
  getStoredAuthSession,
  setStoredAuthSession,
  type AuthSession,
} from "../lib/storage";
import type { LoginRequest } from "../lib/types";

type AuthContextValue = {
  session: AuthSession | null;
  login: (payload: LoginRequest) => Promise<AuthSession>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => getStoredAuthSession());

  const value = useMemo<AuthContextValue>(() => ({
    session,
    async login(payload) {
      const authSession = await api.login(payload) as AuthSession;
      setStoredAuthSession(authSession);
      setSession(authSession);
      return authSession;
    },
    logout() {
      clearStoredAuthSession();
      clearStoredCustomerPortalId();
      setSession(null);
    },
  }), [session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
