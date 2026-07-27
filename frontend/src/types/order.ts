export interface Payment {
  id: number;
  mercadolivre_payment_id: string;
  status: string | null;
  transaction_amount: number;
  payment_method: string | null;
  synced_at: string | null;
}

export interface Order {
  id: number;
  mercadolivre_order_id: string;
  pack_id: string | null;
  status: string | null;
  total_amount: number;
  currency: string | null;
  buyer_nickname: string | null;
  ordered_at: string | null;
  processed_at: string | null;
  synced_at: string | null;
  payments?: Payment[];
}
