export interface Product {
  id: number;
  mercadolivre_item_id: string;
  title: string;
  seller_sku: string | null;
  price: number;
  currency: string | null;
  available_quantity: number;
  status: string | null;
  logistic_type: string | null;
  permalink: string | null;
  thumbnail: string | null;
  synced_at: string | null;
}
