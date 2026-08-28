export type OrderReturnStatus =
  | 'pecas_devolvidas'
  | 'comprou_cancelou'
  | 'valor_retido'
  | 'estorno_valor'
  | 'reembolso'
  | 'desconto_venda'
  | 'desconto_frete'
  | 'venda_balcao';

export interface OrderReturn {
  id: number;
  order_id: number | null;
  mercadolivre_order_id: string | null;
  status: OrderReturnStatus;
  occurred_at: string;
  buyer_name: string | null;
  value: number;
  product_name: string | null;
  verified: boolean;
  source: 'auto' | 'manual';
  created_at: string;
}

export interface OrderReturnSummary {
  currency: string;
  by_status: Record<OrderReturnStatus, { total: number; count: number }>;
}

export interface OrderReturnGroup {
  group_key: string | number;
  order_id: number | null;
  mercadolivre_order_id: string | null;
  ordered_at: string | null;
  buyer_name: string | null;
  product_name: string | null;
  sku: string | null;
  history: OrderReturn[];
}
