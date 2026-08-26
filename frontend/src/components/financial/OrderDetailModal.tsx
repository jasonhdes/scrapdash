'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { getOrder } from '@/services/orders';
import { createReturn, setReturnVerified } from '@/services/returns';
import type { Order } from '@/types/order';
import type { OrderReturnStatus } from '@/types/orderReturn';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { RETURN_STATUS_BADGE_COLORS, RETURN_STATUS_LABELS } from '@/utils/returnStatus';
import { PAYMENT_STATUS_LABELS } from '@/utils/paymentStatus';
import { BRASILIA_TIMEZONE } from '@/utils/format';

const STATUS_OPTIONS: { value: OrderReturnStatus; label: string }[] = [
  { value: 'pecas_devolvidas', label: 'Peças devolvidas' },
  { value: 'comprou_cancelou', label: 'Comprou e cancelou' },
  { value: 'valor_retido', label: 'Valor retido' },
  { value: 'estorno_valor', label: 'Estorno de valor' },
  { value: 'desconto_venda', label: 'Desconto de venda' },
  { value: 'desconto_frete', label: 'Desconto de frete' },
];

const EMPTY_MOVEMENT_FORM = {
  status: 'desconto_venda' as OrderReturnStatus,
  occurred_at: '',
  value: '',
};

const inputClass =
  'rounded-lg border border-stroke bg-transparent px-3 py-2 text-sm text-black outline-none focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary';
const buttonClass =
  'rounded-lg border border-stroke px-4 py-2 text-sm font-medium text-black dark:border-strokedark dark:text-white';
const primaryButtonClass =
  'rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60';

function formatCurrency(value: number, currency: string | null) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currency ?? 'BRL' }).format(value);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleString('pt-BR', { timeZone: BRASILIA_TIMEZONE });
}

function orderProductName(order: Order) {
  return order.items?.map((item) => item.title).filter(Boolean).join(', ') || null;
}

export function OrderDetailModal({
  accountId,
  token,
  orderId,
  onClose,
}: {
  accountId: number;
  token: string;
  orderId: number;
  onClose: () => void;
}) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showMovementForm, setShowMovementForm] = useState(false);
  const [movementForm, setMovementForm] = useState(EMPTY_MOVEMENT_FORM);
  const [isSavingMovement, setIsSavingMovement] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const { data } = await getOrder(accountId, orderId, token);
      setOrder(data);
    } catch {
      setLoadError(
        'Não foi possível carregar este pedido. Verifique se você tem permissão de acesso a Pedidos.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [accountId, orderId, token]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  async function handleToggleVerified(returnId: number, current: boolean) {
    await setReturnVerified(accountId, token, returnId, !current);
    await load();
  }

  async function handleCreateMovement(e: React.FormEvent) {
    e.preventDefault();
    if (!order) return;
    setIsSavingMovement(true);
    try {
      await createReturn(accountId, token, {
        status: movementForm.status,
        occurred_at: movementForm.occurred_at,
        buyer_name: order.buyer_nickname ?? undefined,
        value: Number(movementForm.value),
        product_name: orderProductName(order) ?? undefined,
        order_id: order.id,
      });
      setMovementForm(EMPTY_MOVEMENT_FORM);
      setShowMovementForm(false);
      await load();
    } finally {
      setIsSavingMovement(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-y-auto rounded-sm bg-white p-6 shadow-lg dark:bg-boxdark"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-black dark:text-white">
            {order ? `Pedido ${order.mercadolivre_order_id}` : 'Pedido'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="text-2xl leading-none text-body hover:text-primary dark:text-bodydark"
          >
            ×
          </button>
        </div>

        {isLoading ? (
          <p className="text-sm text-body dark:text-bodydark">Carregando pedido...</p>
        ) : loadError ? (
          <p className="text-sm text-danger">{loadError}</p>
        ) : order ? (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
              <div>
                <span className="text-body dark:text-bodydark">Status: </span>
                <span className="text-black dark:text-white">{order.status ?? '—'}</span>
              </div>
              <div>
                <span className="text-body dark:text-bodydark">Comprador: </span>
                <span className="text-black dark:text-white">{order.buyer_nickname ?? '—'}</span>
              </div>
              <div>
                <span className="text-body dark:text-bodydark">Valor total: </span>
                <span className="text-black dark:text-white">
                  {formatCurrency(order.total_amount, order.currency)}
                </span>
              </div>
              <div>
                <span className="text-body dark:text-bodydark">Data do pedido: </span>
                <span className="text-black dark:text-white">{formatDateTime(order.ordered_at)}</span>
              </div>
              <div>
                <span className="text-body dark:text-bodydark">Liberação: </span>
                <span className="text-black dark:text-white">{formatDateTime(order.money_release_date)}</span>
              </div>
            </div>

            {order.items && order.items.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-black dark:text-white">Produtos</h3>
                <div className="overflow-x-auto rounded-sm border border-stroke dark:border-strokedark">
                  <table className="w-full table-auto text-sm">
                    <thead>
                      <tr className="bg-gray-2 text-center dark:bg-meta-4">
                        <th className="px-3 py-2 font-medium text-black dark:text-white">Produto</th>
                        <th className="px-3 py-2 font-medium text-black dark:text-white">SKU</th>
                        <th className="px-3 py-2 font-medium text-black dark:text-white">Qtd.</th>
                        <th className="px-3 py-2 font-medium text-black dark:text-white">Preço</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((item) => (
                        <tr key={item.id}>
                          <td className="border-b border-stroke px-3 py-2 text-black dark:border-strokedark dark:text-white">
                            {item.title}
                          </td>
                          <td className="border-b border-stroke px-3 py-2 text-center text-body dark:border-strokedark dark:text-bodydark">
                            {item.seller_sku ?? '—'}
                          </td>
                          <td className="border-b border-stroke px-3 py-2 text-center text-black dark:border-strokedark dark:text-white">
                            {item.quantity}
                          </td>
                          <td className="border-b border-stroke px-3 py-2 text-center text-black dark:border-strokedark dark:text-white">
                            {item.unit_price !== null ? formatCurrency(item.unit_price, item.currency) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {order.payments && order.payments.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-black dark:text-white">Pagamentos</h3>
                <div className="overflow-x-auto rounded-sm border border-stroke dark:border-strokedark">
                  <table className="w-full table-auto text-sm">
                    <thead>
                      <tr className="bg-gray-2 text-center dark:bg-meta-4">
                        <th className="px-3 py-2 font-medium text-black dark:text-white">Status</th>
                        <th className="px-3 py-2 font-medium text-black dark:text-white">Valor líquido</th>
                        <th className="px-3 py-2 font-medium text-black dark:text-white">Liberação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.payments.map((payment) => (
                        <tr key={payment.id}>
                          <td className="border-b border-stroke px-3 py-2 text-center dark:border-strokedark">
                            <StatusBadge status={payment.status} labels={PAYMENT_STATUS_LABELS} />
                          </td>
                          <td className="border-b border-stroke px-3 py-2 text-center text-black dark:border-strokedark dark:text-white">
                            {payment.net_received_amount !== null
                              ? formatCurrency(payment.net_received_amount, order.currency)
                              : '—'}
                          </td>
                          <td className="border-b border-stroke px-3 py-2 text-center text-body dark:border-strokedark dark:text-bodydark">
                            {formatDateTime(payment.money_release_date)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-black dark:text-white">
                  Status de devolução/cancelamento
                </h3>
                <button
                  type="button"
                  onClick={() => setShowMovementForm((v) => !v)}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  {showMovementForm ? 'Cancelar' : '+ Nova atualização'}
                </button>
              </div>

              {showMovementForm && (
                <form
                  onSubmit={handleCreateMovement}
                  className="mb-3 flex flex-wrap items-end gap-3 rounded-sm border border-stroke p-3 dark:border-strokedark"
                >
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="movement-status" className="text-xs font-medium text-black dark:text-white">
                      Status
                    </label>
                    <select
                      id="movement-status"
                      value={movementForm.status}
                      onChange={(e) =>
                        setMovementForm((f) => ({ ...f, status: e.target.value as OrderReturnStatus }))
                      }
                      className={inputClass}
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="movement-date" className="text-xs font-medium text-black dark:text-white">
                      Data
                    </label>
                    <input
                      id="movement-date"
                      type="datetime-local"
                      required
                      value={movementForm.occurred_at}
                      onChange={(e) => setMovementForm((f) => ({ ...f, occurred_at: e.target.value }))}
                      className={inputClass}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="movement-value" className="text-xs font-medium text-black dark:text-white">
                      Valor
                    </label>
                    <input
                      id="movement-value"
                      type="number"
                      step="0.01"
                      required
                      value={movementForm.value}
                      onChange={(e) => setMovementForm((f) => ({ ...f, value: e.target.value }))}
                      className={`${inputClass} w-28`}
                    />
                  </div>
                  <button type="submit" disabled={isSavingMovement} className={primaryButtonClass}>
                    {isSavingMovement ? 'Salvando...' : 'Salvar'}
                  </button>
                </form>
              )}

              {order.return_statuses && order.return_statuses.length > 0 ? (
                <div className="overflow-x-auto rounded-sm border border-stroke dark:border-strokedark">
                  <table className="w-full table-auto text-sm">
                    <thead>
                      <tr className="bg-gray-2 text-center dark:bg-meta-4">
                        <th className="px-3 py-2 font-medium text-black dark:text-white">Status</th>
                        <th className="px-3 py-2 font-medium text-black dark:text-white">Valor</th>
                        <th className="px-3 py-2 font-medium text-black dark:text-white">Data</th>
                        <th className="px-3 py-2 font-medium text-black dark:text-white">Conferido</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.return_statuses.map((entry) => (
                        <tr key={entry.id} className={entry.verified ? 'bg-gray-200 dark:bg-meta-4/70' : ''}>
                          <td className="border-b border-stroke px-3 py-2 text-center dark:border-strokedark">
                            <StatusBadge
                              status={entry.status}
                              labels={RETURN_STATUS_LABELS}
                              colors={RETURN_STATUS_BADGE_COLORS}
                            />
                          </td>
                          <td className="border-b border-stroke px-3 py-2 text-center text-black dark:border-strokedark dark:text-white">
                            {formatCurrency(entry.value, order.currency)}
                          </td>
                          <td className="border-b border-stroke px-3 py-2 text-center text-body dark:border-strokedark dark:text-bodydark">
                            {formatDateTime(entry.occurred_at)}
                          </td>
                          <td className="border-b border-stroke px-3 py-2 text-center dark:border-strokedark">
                            <input
                              type="checkbox"
                              checked={entry.verified}
                              onChange={() => handleToggleVerified(entry.id, entry.verified)}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-body dark:text-bodydark">
                  Nenhum evento de devolução/cancelamento registrado para este pedido.
                </p>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-stroke pt-4 dark:border-strokedark">
              <Link href={`/orders/${orderId}`} className="text-sm font-medium text-primary hover:underline">
                Ver pedido completo
              </Link>
              <button type="button" onClick={onClose} className={buttonClass}>
                Fechar
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
