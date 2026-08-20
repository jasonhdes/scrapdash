export interface Product {
  id: number;
  mercadolivre_item_id: string;
  title: string;
  seller_sku: string | null;
  price: number;
  sale_fee_amount: number | null;
  net_amount: number | null;
  currency: string | null;
  available_quantity: number;
  completed_sales_count: number;
  status: string | null;
  logistic_type: string | null;
  permalink: string | null;
  thumbnail: string | null;
  synced_at: string | null;
}
