export interface PaymentWithOrder {
  id: number;
  mercadolivre_payment_id: string;
  status: string | null;
  net_received_amount: number | null;
  paid_at: string | null;
  money_release_date: string | null;
  released: boolean | null;
  synced_at: string | null;
  order?: { id: number; mercadolivre_order_id: string };
}

export interface FinancialSummary {
  period: { start_date: string | null; end_date: string | null };
  total_gross: number;
  total_net: number;
  total_received: { total: number; amount: number };
  pending_receivable: { total: number; amount: number };
  cancelled_sales: { total: number; amount: number };
  held_value: { total: number; amount: number };
}

export interface FinancialBalance {
  seed: { value: number | null; updated_at: string | null };
  sales_net_total: number;
  purchases_total: number;
  cancellations_total: number;
  freight_discounts_total: number;
  current_balance: number;
  pending_review_count: number;
  last_validated_at: string | null;
}
