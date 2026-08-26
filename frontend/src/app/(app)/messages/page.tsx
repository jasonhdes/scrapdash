'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useAccounts } from '@/hooks/useAccounts';
import { useConversations } from '@/hooks/useConversations';
import { getConversation, replyToConversation } from '@/services/messages';
import type { ConversationThread } from '@/types/message';
import { AccountSelector } from '@/components/dashboard/AccountSelector';
import { BRASILIA_TIMEZONE } from '@/utils/format';

function formatDateTime(value: string | null) {
  if (!value) return '';
  return new Date(value).toLocaleString('pt-BR', { timeZone: BRASILIA_TIMEZONE });
}

export default function MessagesPage() {
  const { token } = useAuth();
  const { accounts, selectedAccountId, setSelectedAccountId } = useAccounts(token);
  const {
    conversations,
    unreadTotal,
    isLoading: conversationsLoading,
    refresh: refreshConversations,
  } = useConversations(selectedAccountId, token);

  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [thread, setThread] = useState<ConversationThread | null>(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedOrderId(null);
    setThread(null);
  }, [selectedAccountId]);

  // O backend já entrega as conversas ordenadas da mais recente pra mais
  // antiga (por data da última mensagem) — o filtro só reduz a lista sem
  // reordenar, então essa ordem sempre se mantém.
  const visibleConversations = unreadOnly
    ? conversations.filter((conversation) => conversation.unread_count > 0)
    : conversations;

  async function openConversation(orderId: number) {
    if (!selectedAccountId || !token) return;
    setSelectedOrderId(orderId);
    setThreadLoading(true);
    setError(null);
    try {
      const { data } = await getConversation(selectedAccountId, orderId, token);
      setThread(data);
    } finally {
      setThreadLoading(false);
    }
  }

  async function handleReply(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedAccountId || !token || !selectedOrderId || !replyText.trim()) return;

    setIsSending(true);
    setError(null);
    try {
      await replyToConversation(selectedAccountId, selectedOrderId, replyText.trim(), token);
      setReplyText('');
      await openConversation(selectedOrderId);
      await refreshConversations();
    } catch {
      setError('Não foi possível enviar a resposta. Tente novamente.');
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-title-md font-bold text-black dark:text-white">Mensagens</h1>
          <p className="mt-1 text-sm text-body dark:text-bodydark">
            Perguntas e conversas de pós-venda do Mercado Livre.
          </p>
        </div>
        <AccountSelector
          accounts={accounts}
          selectedId={selectedAccountId}
          onChange={setSelectedAccountId}
        />
      </div>

      <div className="grid grid-cols-1 overflow-hidden rounded-sm border border-stroke bg-white shadow-1 dark:border-strokedark dark:bg-boxdark md:h-[600px] md:grid-cols-[300px_1fr]">
        <div className="flex flex-col overflow-y-auto border-b border-stroke dark:border-strokedark md:border-b-0 md:border-r">
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-stroke px-4 py-2.5 dark:border-strokedark">
            <label className="flex items-center gap-2 text-sm text-black dark:text-white">
              <input
                type="checkbox"
                checked={unreadOnly}
                onChange={(e) => setUnreadOnly(e.target.checked)}
              />
              Só não lidas
            </label>
            {unreadTotal > 0 && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-white">
                {unreadTotal}
              </span>
            )}
          </div>

          {conversationsLoading && conversations.length === 0 ? (
            <p className="p-4 text-sm text-body dark:text-bodydark">Carregando conversas...</p>
          ) : visibleConversations.length === 0 ? (
            <p className="p-4 text-sm text-body dark:text-bodydark">
              {unreadOnly ? 'Nenhuma conversa não lida.' : 'Nenhuma conversa encontrada.'}
            </p>
          ) : (
            visibleConversations.map((conversation) => (
              <button
                key={conversation.order_id}
                onClick={() => openConversation(conversation.order_id)}
                className={`flex flex-col gap-0.5 border-b border-stroke px-4 py-3 text-left hover:bg-gray-2 dark:border-strokedark dark:hover:bg-meta-4 ${
                  selectedOrderId === conversation.order_id ? 'bg-gray-2 dark:bg-meta-4' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-black dark:text-white">
                    {conversation.buyer_nickname ?? '—'}
                  </span>
                  {conversation.unread_count > 0 && (
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
                  )}
                </div>
                <span className="truncate text-sm text-body dark:text-bodydark">
                  {conversation.last_message?.direction === 'sent' ? 'Você: ' : ''}
                  {conversation.last_message?.text ?? '—'}
                </span>
              </button>
            ))
          )}
        </div>

        <div className="flex min-h-0 flex-col">
          {!selectedOrderId ? (
            <div className="flex h-full items-center justify-center p-10 text-sm text-body dark:text-bodydark">
              Selecione uma conversa à esquerda.
            </div>
          ) : threadLoading || !thread ? (
            <div className="flex h-full items-center justify-center p-10 text-sm text-body dark:text-bodydark">
              Carregando conversa...
            </div>
          ) : (
            <>
              <div className="border-b border-stroke px-4 py-3 font-medium text-black dark:border-strokedark dark:text-white">
                {thread.order.buyer_nickname ?? '—'} ·{' '}
                <Link href={`/orders/${thread.order.id}`} className="font-medium text-primary">
                  Pedido {thread.order.mercadolivre_order_id}
                </Link>
              </div>

              <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto p-4">
                {thread.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`max-w-[70%] rounded-xl px-3 py-2 text-sm ${
                      message.direction === 'sent'
                        ? 'self-end bg-primary text-white'
                        : 'self-start bg-gray-2 text-black dark:bg-meta-4 dark:text-white'
                    }`}
                  >
                    <div>{message.text}</div>
                    <div className="mt-1 text-xs opacity-70">{formatDateTime(message.sent_at)}</div>
                  </div>
                ))}
              </div>

              <form
                onSubmit={handleReply}
                className="flex gap-2 border-t border-stroke p-4 dark:border-strokedark"
              >
                <textarea
                  rows={2}
                  placeholder="Escreva uma resposta..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  disabled={isSending}
                  style={{ paddingLeft: 12 }}
                  className="flex-1 resize-none rounded-lg border border-stroke bg-transparent py-2 pr-3 text-sm text-black outline-none focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                />
                <button
                  type="submit"
                  disabled={isSending || !replyText.trim()}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {isSending ? 'Enviando...' : 'Enviar'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
