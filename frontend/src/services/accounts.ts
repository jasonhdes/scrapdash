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

/**
 * Dispara a sincronização com o Mercado Livre em segundo plano (o backend
 * decide se vale a pena disparar de novo ou se já rodou recentemente).
 * Fire-and-forget: falha aqui não deve travar a tela, os dados já
 * carregados vêm do banco local normalmente.
 */
export function triggerMercadoLivreSync(accountId: number, token: string) {
  return apiFetch<{ triggered: boolean }>(`/accounts/${accountId}/mercadolivre/sync`, {
    method: "POST",
    token,
  }).catch(() => undefined);
}
