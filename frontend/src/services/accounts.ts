import { apiFetch } from "@/services/api";
import type { Account } from "@/types/account";

export function listAccounts(token: string) {
  return apiFetch<{ data: Account[] }>("/accounts", { token });
}

export function connectMercadoLivre(accountId: number, token: string) {
  return apiFetch<{ redirect_url: string }>(`/accounts/${accountId}/mercadolivre/connect`, {
    method: "POST",
    token,
  });
}
