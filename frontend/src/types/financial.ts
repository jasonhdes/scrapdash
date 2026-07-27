export interface PaymentWithOrder {
  id: number;
  mercadolivre_payment_id: string;
  status: string | null;
  transaction_amount: number;
  payment_method: string | null;
  paid_at: string | null;
  money_release_date: string | null;
  released: boolean | null;
  synced_at: string | null;
  order?: { id: number; mercadolivre_order_id: string };
}

export interface FinancialSummary {
  period: { start_date: string | null; end_date: string | null };
  total_received: number;
  by_status: Record<string, { total: number; amount: number }>;
  by_method: Record<string, { total: number; amount: number }>;
}

export interface ReconciliationRow {
  order_id: number;
  mercadolivre_order_id: string;
  ordered_at: string | null;
  order_total: number;
  approved_amount: number;
  difference: number;
}
