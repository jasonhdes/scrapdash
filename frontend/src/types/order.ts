export interface Payment {
  id: number;
  mercadolivre_payment_id: string;
  status: string | null;
  transaction_amount: number;
  payment_method: string | null;
  paid_at: string | null;
  money_release_date: string | null;
  released: boolean | null;
  ml_fee: number | null;
  mp_processing_fee: number | null;
  shipping_fee: number | null;
  financing_fee: number | null;
  coupon_amount: number | null;
  net_received_amount: number | null;
  synced_at: string | null;
}

export interface OrderItem {
  id: number;
  mercadolivre_item_id: string;
  child_order_number: string | null;
  title: string;
  seller_sku: string | null;
  quantity: number;
  unit_price: number | null;
  currency: string | null;
}

export interface OrderReturnStatusEntry {
  id: number;
  status: string;
  occurred_at: string;
  value: number;
  verified: boolean;
  source: "auto" | "manual";
}

export interface OrderReturnHistoryEntry {
  id: number;
  status: string;
  occurred_at: string;
  value: number;
  source: "auto" | "manual";
  created_at: string;
}

export interface PackSibling {
  id: number;
  mercadolivre_order_id: string;
  total_amount: number;
}

export interface Order {
  id: number;
  mercadolivre_order_id: string;
  pack_id: string | null;
  pack_total_amount?: number | null;
  pack_order_numbers?: string[] | null;
  pack_siblings?: PackSibling[];
  status: string | null;
  shipping_status: string | null;
  logistic_type: string | null;
  total_amount: number;
  currency: string | null;
  buyer_nickname: string | null;
  buyer_city: string | null;
  buyer_state: string | null;
  ordered_at: string | null;
  processed_at: string | null;
  synced_at: string | null;
  in_mediation?: boolean;
  money_release_date?: string | null;
  money_released?: boolean | null;
  paid_amount?: number | null;
  ml_fee?: number | null;
  mp_processing_fee?: number | null;
  shipping_fee?: number | null;
  financing_fee?: number | null;
  coupon_amount?: number | null;
  net_received_amount?: number | null;
  items?: OrderItem[];
  payments?: Payment[];
  return_statuses?: OrderReturnStatusEntry[];
  return_history?: OrderReturnHistoryEntry[];
}
