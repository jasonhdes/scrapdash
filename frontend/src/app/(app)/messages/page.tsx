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
import listStyles from '@/styles/list.module.css';
import styles from '@/styles/messages.module.css';

function formatDateTime(value: string | null) {
  if (!value) return '';
  return new Date(value).toLocaleString('pt-BR', { timeZone: BRASILIA_TIMEZONE });
}

export default function MessagesPage() {
  const { token } = useAuth();
  const { accounts, selectedAccountId, setSelectedAccountId } = useAccounts(token);
  const {
    conversations,
    isLoading: conversationsLoading,
    refresh: refreshConversations,
  } = useConversations(selectedAccountId, token);

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
    <div className={listStyles.container}>
      <div className={listStyles.header}>
        <div>
          <h1 className={listStyles.title}>Mensagens</h1>
          <p className={listStyles.subtitle}>
            Perguntas e conversas de pós-venda do Mercado Livre.
          </p>
        </div>
        <AccountSelector
          accounts={accounts}
          selectedId={selectedAccountId}
          onChange={setSelectedAccountId}
        />
      </div>

      <div className={styles.layout}>
        <div className={styles.conversationList}>
          {conversationsLoading && conversations.length === 0 ? (
            <p className={listStyles.subtitle} style={{ padding: 14 }}>
              Carregando conversas...
            </p>
          ) : conversations.length === 0 ? (
            <p className={listStyles.subtitle} style={{ padding: 14 }}>
              Nenhuma conversa encontrada.
            </p>
          ) : (
            conversations.map((conversation) => (
              <button
                key={conversation.order_id}
                className={`${styles.conversationItem} ${
                  selectedOrderId === conversation.order_id ? styles.conversationItemActive : ''
                }`}
                onClick={() => openConversation(conversation.order_id)}
              >
                <div className={styles.conversationTop}>
                  <span className={styles.conversationBuyer}>
                    {conversation.buyer_nickname ?? '—'}
                  </span>
                  {conversation.unread_count > 0 && <span className={styles.unreadDot} />}
                </div>
                <span className={styles.conversationPreview}>
                  {conversation.last_message?.direction === 'sent' ? 'Você: ' : ''}
                  {conversation.last_message?.text ?? '—'}
                </span>
              </button>
            ))
          )}
        </div>

        <div className={styles.thread}>
          {!selectedOrderId ? (
            <div className={styles.empty}>Selecione uma conversa à esquerda.</div>
          ) : threadLoading || !thread ? (
            <div className={styles.empty}>Carregando conversa...</div>
          ) : (
            <>
              <div className={styles.threadHeader}>
                {thread.order.buyer_nickname ?? '—'} ·{' '}
                <Link href={`/orders/${thread.order.id}`} className={listStyles.link}>
                  Pedido {thread.order.mercadolivre_order_id}
                </Link>
              </div>

              <div className={styles.threadMessages}>
                {thread.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`${styles.bubble} ${
                      message.direction === 'sent' ? styles.bubbleSent : styles.bubbleReceived
                    }`}
                  >
                    <div>{message.text}</div>
                    <div className={styles.bubbleMeta}>{formatDateTime(message.sent_at)}</div>
                  </div>
                ))}
              </div>

              <form className={styles.replyForm} onSubmit={handleReply}>
                <textarea
                  rows={2}
                  placeholder="Escreva uma resposta..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  disabled={isSending}
                />
                <button
                  type="submit"
                  className={listStyles.pageButton}
                  disabled={isSending || !replyText.trim()}
                >
                  {isSending ? 'Enviando...' : 'Enviar'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {error && <p className={listStyles.subtitle}>{error}</p>}
    </div>
  );
}
