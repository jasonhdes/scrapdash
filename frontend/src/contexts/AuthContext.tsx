"use client";

import { createContext, useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import * as authService from "@/services/auth";
import { TOKEN_STORAGE_KEY } from "@/services/api";
import type { LoginPayload, RegisterPayload, User } from "@/types/auth";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = window.localStorage.getItem(TOKEN_STORAGE_KEY);

    if (!storedToken) {
      setIsLoading(false);
      return;
    }

    authService
      .me(storedToken)
      .then(({ user: loadedUser }) => {
        // Só aplica o resultado se esse ainda for o token "atual" — evita
        // sobrescrever um login mais novo feito enquanto essa checagem
        // (de um token antigo guardado no localStorage) ainda estava em voo.
        if (window.localStorage.getItem(TOKEN_STORAGE_KEY) === storedToken) {
          setToken(storedToken);
          setUser(loadedUser);
        }
      })
      .catch(() => {
        if (window.localStorage.getItem(TOKEN_STORAGE_KEY) === storedToken) {
          window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    const response = await authService.login(payload);
    window.localStorage.setItem(TOKEN_STORAGE_KEY, response.access_token);
    setToken(response.access_token);
    setUser(response.user);
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const response = await authService.register(payload);
    window.localStorage.setItem(TOKEN_STORAGE_KEY, response.access_token);
    setToken(response.access_token);
    setUser(response.user);
  }, []);

  const loginWithGoogle = useCallback(async (credential: string) => {
    const response = await authService.loginWithGoogle(credential);
    window.localStorage.setItem(TOKEN_STORAGE_KEY, response.access_token);
    setToken(response.access_token);
    setUser(response.user);
  }, []);

  const logout = useCallback(async () => {
    if (token) {
      await authService.logout(token).catch(() => undefined);
    }
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
  }, [token]);

  const refreshSession = useCallback(async () => {
    if (!token) return;
    try {
      const response = await authService.refresh(token);
      window.localStorage.setItem(TOKEN_STORAGE_KEY, response.access_token);
      setToken(response.access_token);
      setUser(response.user);
    } catch {
      // Token já expirado: o apiFetch cuidou de limpar a sessão e mandar
      // pro login (não dá pra renovar um token depois que ele já venceu).
    }
  }, [token]);

  return (
    <AuthContext.Provider
      value={{ user, token, isLoading, login, register, loginWithGoogle, logout, refreshSession }}
    >
      {children}
    </AuthContext.Provider>
  );
}
