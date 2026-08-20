export interface DashboardAlert {
  type: string;
  message: string;
}

export interface DashboardData {
  account: { id: number; name: string };
  period: { start_date: string | null; end_date: string | null };
  revenue: { total: number; net_total: number; currency: string | null };
  orders: {
    total: number;
    by_status: Record<string, number>;
    shipped: number;
    returned: number;
    by_group: { completed: number; in_transit: number; returned: number; cancelled: number };
  };
  products: { total: number; active: number };
  payments: { by_status: Record<string, number> };
  messages: { total: number; received: number };
  alerts: DashboardAlert[];
  last_synced_at: string | null;
  generated_at: string;
}

export interface RevenueSeriesPoint {
  date: string;
  revenue: number;
  net_revenue: number;
}

export interface RevenueSeriesData {
  period: { start_date: string; end_date: string };
  currency: string | null;
  series: RevenueSeriesPoint[];
}

export interface CustomersByStateRow {
  state: string;
  total: number;
}

export interface CustomersByStateData {
  data: CustomersByStateRow[];
}
