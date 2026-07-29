import { apiFetch } from "@/services/api";
import type { Conversation, ConversationThread, Message } from "@/types/message";

export function listConversations(accountId: number, token: string) {
  return apiFetch<{ data: Conversation[]; meta: { unread_total: number } }>(
    `/accounts/${accountId}/messages`,
    { token },
  );
}

export function getConversation(accountId: number, orderId: number, token: string) {
  return apiFetch<{ data: ConversationThread }>(`/accounts/${accountId}/orders/${orderId}/messages`, { token });
}

export function replyToConversation(accountId: number, orderId: number, text: string, token: string) {
  return apiFetch<{ data: Message }>(`/accounts/${accountId}/orders/${orderId}/messages`, {
    method: "POST",
    token,
    body: JSON.stringify({ text }),
  });
}
