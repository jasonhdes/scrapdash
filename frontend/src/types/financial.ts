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

export interface FinancialPeriodSnapshot {
  previous_balance: number;
  total_sales: number;
  held_balance: number;
  refunded_balance: number;
  discounts: number;
  despesas: number;
  ending_balance: number;
  created_at: string;
  closed_at: string | null;
}

export interface FinancialPeriods {
  current: FinancialPeriodSnapshot;
  previous: FinancialPeriodSnapshot | null;
}

export type EditablePeriodField =
  | "previous_balance"
  | "total_sales"
  | "held_balance"
  | "refunded_balance"
  | "discounts";
