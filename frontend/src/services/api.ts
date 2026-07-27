import type { ApiErrorBody } from "@/types/auth";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://scrapdash.local/api";
export const TOKEN_STORAGE_KEY = "scrapdash_token";

const PUBLIC_PATHS = ["/login", "/register"];

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.status = status;
    this.errors = body.errors;
  }
}

function handleExpiredSession() {
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);

  const isOnPublicPath = PUBLIC_PATHS.some((path) => window.location.pathname.startsWith(path));
  if (!isOnPublicPath) {
    window.location.href = "/login";
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, headers, ...rest } = options;

  const response = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  if (response.status === 401 && token) {
    // A requisição tinha um token e ainda assim voltou 401: a sessão expirou
    // ou o token não é mais válido (não é o caso de "senha errada" no login,
    // que nunca envia token). Limpa a sessão e manda pro login de novo.
    handleExpiredSession();
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => ({ message: response.statusText }))) as ApiErrorBody;
    throw new ApiError(response.status, body);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
