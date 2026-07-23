import { apiFetch } from "@/services/api";
import type { AuthResponse, LoginPayload, RegisterPayload, User } from "@/types/auth";

export function login(payload: LoginPayload) {
  return apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function register(payload: RegisterPayload) {
  return apiFetch<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function me(token: string) {
  return apiFetch<{ user: User }>("/auth/me", { token });
}

export function logout(token: string) {
  return apiFetch<{ message: string }>("/auth/logout", {
    method: "POST",
    token,
  });
}
