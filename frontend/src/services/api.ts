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

function handleExpiredSession(expiredToken: string) {
  // Se um login mais novo já substituiu esse token enquanto essa requisição
  // (com o token velho) ainda estava em voo, essa sessão nova é válida —
  // não derruba ela por causa de uma resposta atrasada de um token antigo.
  if (window.localStorage.getItem(TOKEN_STORAGE_KEY) !== expiredToken) {
    return;
  }

  window.localStorage.removeItem(TOKEN_STORAGE_KEY);

  const isOnPublicPath = PUBLIC_PATHS.some((path) => window.location.pathname.startsWith(path));
  if (!isOnPublicPath) {
    window.location.href = "/login";
  }
}

function doFetch(path: string, options: RequestInit & { token?: string }) {
  const { token, headers, ...rest } = options;

  return fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token } = options;

  let response = await doFetch(path, options);

  if (response.status === 401 && token) {
    // Um 401 isolado pode ser uma falha passageira do backend (já
    // observamos o JWT_SECRET vir vazio em requisições pontuais, sem
    // relação com o token em si) em vez do token realmente ter expirado —
    // e como uma página costuma disparar várias chamadas em paralelo, uma
    // falha assim já bastava pra deslogar mesmo com sessão válida. Repete
    // uma vez antes de aceitar que a sessão expirou de verdade: um token
    // genuinamente inválido/expirado falha de novo; uma oscilação passa.
    response = await doFetch(path, options);
  }

  if (response.status === 401 && token) {
    handleExpiredSession(token);
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
