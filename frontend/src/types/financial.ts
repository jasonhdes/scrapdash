export interface PaymentWithOrder {
  id: number;
  mercadolivre_payment_id: string;
  status: string | null;
  net_received_amount: number | null;
  paid_at: string | null;
  money_release_date: string | null;
  released: boolean | null;
  synced_at: string | null;
  order?: {
    id: number;
    mercadolivre_order_id: string;
    pack_id: string | null;
    pack_total_amount: number | null;
    pack_order_numbers: string[] | null;
  };
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

export interface MercadoPagoBalance {
  pending_balance: number | null;
  available_balance: number | null;
}

export interface FinancialPeriods {
  current: FinancialPeriodSnapshot;
  previous: FinancialPeriodSnapshot | null;
  mercadopago: MercadoPagoBalance;
}

export type EditablePeriodField =
  | "previous_balance"
  | "total_sales"
  | "held_balance"
  | "refunded_balance"
  | "discounts";

export type MercadoPagoField = "pending_balance" | "available_balance";
