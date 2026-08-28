export type MovementType =
  | 'venda'
  | 'liberacao'
  | 'pecas_devolvidas'
  | 'comprou_cancelou'
  | 'valor_retido'
  | 'estorno_valor'
  | 'reembolso'
  | 'desconto_venda'
  | 'desconto_frete'
  | 'venda_balcao';

export interface Movement {
  id: string;
  type: MovementType;
  label: string;
  occurred_at: string | null;
  order_id: number | null;
  mercadolivre_order_id: string | null;
  buyer_name: string | null;
  product_name: string | null;
  value: number;
}

export interface MonthlyReportFees {
  ml_fee: number;
  mp_processing_fee: number;
  shipping_fee: number;
}

export interface MonthlyReportRow {
  month: string;
  orders_count: number;
  gross_revenue: number;
  net_revenue: number;
  fees: MonthlyReportFees;
  returns_total: number;
  returns_by_status: Record<string, { total: number; count: number }>;
}

export interface MonthlyReportResponse {
  currency: string;
  period: { start_date: string | null; end_date: string | null };
  data: MonthlyReportRow[];
}
