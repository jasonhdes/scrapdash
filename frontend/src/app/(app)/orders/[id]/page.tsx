'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useAccounts } from '@/hooks/useAccounts';
import { getOrder, markOrderProcessed } from '@/services/orders';
import type { Order } from '@/types/order';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { BRASILIA_TIMEZONE, formatReleaseDate } from '@/utils/format';

const buttonClass =
  'rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60';

function formatCurrency(value: number, currency: string | null) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency ?? 'BRL',
  }).format(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleString('pt-BR', { timeZone: BRASILIA_TIMEZONE });
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const orderId = Number(params.id);
  const { token } = useAuth();
  const { selectedAccountId } = useAccounts(token);

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const loadOrder = useCallback(async () => {
    if (!selectedAccountId || !token) return;
    setIsLoading(true);
    try {
      const { data } = await getOrder(selectedAccountId, orderId, token);
      setOrder(data);
    } finally {
      setIsLoading(false);
    }
  }, [selectedAccountId, token, orderId]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  async function handleToggleProcessed() {
    if (!selectedAccountId || !token || !order) return;
    setIsUpdating(true);
    try {
      const { data } = await markOrderProcessed(
        selectedAccountId,
        order.id,
        !order.processed_at,
        token,
      );
      setOrder(data);
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Link href="/orders" className="text-sm font-medium text-primary">
        ← Voltar para pedidos
      </Link>

      {isLoading || !order ? (
        <p className="text-sm text-body dark:text-bodydark">Carregando pedido...</p>
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-title-md font-bold text-black dark:text-white">
                Pedido {order.mercadolivre_order_id}
              </h1>
              <p className="mt-1 text-sm text-body dark:text-bodydark">
                Comprador: {order.buyer_nickname ?? '—'}
                {(order.buyer_city || order.buyer_state) && (
                  <> ({[order.buyer_city, order.buyer_state].filter(Boolean).join('/')})</>
                )}{' '}
                · Status: {order.status}
              </p>
            </div>
            <button disabled={isUpdating} onClick={handleToggleProcessed} className={buttonClass}>
              {order.processed_at ? 'Desmarcar como processado' : 'Marcar como processado'}
            </button>
          </div>

          <div className="overflow-x-auto rounded-sm border border-stroke bg-white shadow-1 dark:border-strokedark dark:bg-boxdark">
            <table className="w-full table-auto">
              <tbody>
                <tr>
                  <th className="border-b border-stroke px-4 py-3 text-left font-medium text-black dark:border-strokedark dark:text-white">
                    Valor total
                  </th>
                  <td className="border-b border-stroke px-4 py-3 text-black dark:border-strokedark dark:text-white">
                    {formatCurrency(order.total_amount, order.currency)}
                  </td>
                </tr>
                <tr>
                  <th className="border-b border-stroke px-4 py-3 text-left font-medium text-black dark:border-strokedark dark:text-white">
                    Data do pedido
                  </th>
                  <td className="border-b border-stroke px-4 py-3 text-black dark:border-strokedark dark:text-white">
                    {formatDate(order.ordered_at)}
                  </td>
                </tr>
                <tr>
                  <th className="border-b border-stroke px-4 py-3 text-left font-medium text-black dark:border-strokedark dark:text-white">
                    Liberação do dinheiro
                  </th>
                  <td className="border-b border-stroke px-4 py-3 text-black dark:border-strokedark dark:text-white">
                    {formatReleaseDate(order.money_release_date, order.money_released)}
                  </td>
                </tr>
                <tr>
                  <th className="border-b border-stroke px-4 py-3 text-left font-medium text-black dark:border-strokedark dark:text-white">
                    Processado em
                  </th>
                  <td className="border-b border-stroke px-4 py-3 text-black dark:border-strokedark dark:text-white">
                    {formatDate(order.processed_at)}
                  </td>
                </tr>
                <tr>
                  <th className="border-b border-stroke px-4 py-3 text-left font-medium text-black dark:border-strokedark dark:text-white">
                    Última sincronização
                  </th>
                  <td className="border-b border-stroke px-4 py-3 text-black dark:border-strokedark dark:text-white">
                    {formatDate(order.synced_at)}
                  </td>
                </tr>
                {order.pack_id && (
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-black dark:text-white">
                      Pack
                    </th>
                    <td className="px-4 py-3 text-black dark:text-white">{order.pack_id}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <h2 className="text-lg font-semibold text-black dark:text-white">Produtos</h2>

          {order.items && order.items.length > 0 ? (
            <div className="overflow-x-auto rounded-sm border border-stroke bg-white shadow-1 dark:border-strokedark dark:bg-boxdark">
              <table className="w-full table-auto">
                <thead>
                  <tr className="bg-gray-2 text-center dark:bg-meta-4">
                    <th className="px-4 py-4 font-medium text-black dark:text-white">Produto</th>
                    <th className="px-4 py-4 font-medium text-black dark:text-white">SKU</th>
                    <th className="px-4 py-4 font-medium text-black dark:text-white">Quantidade</th>
                    <th className="px-4 py-4 font-medium text-black dark:text-white">
                      Preço unitário
                    </th>
                    <th className="px-4 py-4 font-medium text-black dark:text-white">
                      Pedido filho
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td className="border-b border-stroke px-4 py-3 text-black dark:border-strokedark dark:text-white">
                        {item.title}
                      </td>
                      <td className="border-b border-stroke px-4 py-3 text-body dark:border-strokedark dark:text-bodydark">
                        {item.seller_sku ?? '—'}
                      </td>
                      <td className="border-b border-stroke px-4 py-3 text-black dark:border-strokedark dark:text-white">
                        {item.quantity}
                      </td>
                      <td className="border-b border-stroke px-4 py-3 text-black dark:border-strokedark dark:text-white">
                        {item.unit_price !== null
                          ? formatCurrency(item.unit_price, item.currency)
                          : '—'}
                      </td>
                      <td className="border-b border-stroke px-4 py-3 text-body dark:border-strokedark dark:text-bodydark">
                        {item.child_order_number ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-body dark:text-bodydark">
              Nenhum produto sincronizado para este pedido.
            </p>
          )}

          <h2 className="text-lg font-semibold text-black dark:text-white">Pagamentos</h2>

          {order.payments && order.payments.length > 0 ? (
            <div className="overflow-x-auto rounded-sm border border-stroke bg-white shadow-1 dark:border-strokedark dark:bg-boxdark">
              <table className="w-full table-auto">
                <thead>
                  <tr className="bg-gray-2 text-center dark:bg-meta-4">
                    <th className="px-4 py-4 font-medium text-black dark:text-white">ID</th>
                    <th className="px-4 py-4 font-medium text-black dark:text-white">Status</th>
                    <th className="px-4 py-4 font-medium text-black dark:text-white">Valor</th>
                    <th className="px-4 py-4 font-medium text-black dark:text-white">Método</th>
                    <th className="px-4 py-4 font-medium text-black dark:text-white">Liberação</th>
                  </tr>
                </thead>
                <tbody>
                  {order.payments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="border-b border-stroke px-4 py-3 text-black dark:border-strokedark dark:text-white">
                        {payment.mercadolivre_payment_id}
                      </td>
                      <td className="border-b border-stroke px-4 py-3 dark:border-strokedark">
                        <StatusBadge status={payment.status} />
                      </td>
                      <td className="border-b border-stroke px-4 py-3 text-black dark:border-strokedark dark:text-white">
                        {formatCurrency(payment.transaction_amount, order.currency)}
                      </td>
                      <td className="border-b border-stroke px-4 py-3 text-body dark:border-strokedark dark:text-bodydark">
                        {payment.payment_method ?? '—'}
                      </td>
                      <td className="border-b border-stroke px-4 py-3 text-body dark:border-strokedark dark:text-bodydark">
                        {formatReleaseDate(payment.money_release_date, payment.released)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-body dark:text-bodydark">
              Nenhum pagamento sincronizado para este pedido.
            </p>
          )}
        </>
      )}
    </div>
  );
}
