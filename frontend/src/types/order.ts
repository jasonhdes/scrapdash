export interface Payment {
  id: number;
  mercadolivre_payment_id: string;
  status: string | null;
  transaction_amount: number;
  payment_method: string | null;
  paid_at: string | null;
  money_release_date: string | null;
  released: boolean | null;
  synced_at: string | null;
}

export interface OrderItem {
  id: number;
  mercadolivre_item_id: string;
  title: string;
  seller_sku: string | null;
  quantity: number;
  unit_price: number | null;
  currency: string | null;
}

export interface Order {
  id: number;
  mercadolivre_order_id: string;
  pack_id: string | null;
  status: string | null;
  total_amount: number;
  currency: string | null;
  buyer_nickname: string | null;
  buyer_city: string | null;
  buyer_state: string | null;
  ordered_at: string | null;
  processed_at: string | null;
  synced_at: string | null;
  money_release_date?: string | null;
  money_released?: boolean | null;
  items?: OrderItem[];
  payments?: Payment[];
}
