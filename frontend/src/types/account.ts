import type { ModulePermissions } from "@/types/employee";

export interface Account {
  id: number;
  name: string;
  marketplace: string;
  mercadolivre_connected: boolean;
  mercadolivre_token_expired: boolean;
  permissions: ModulePermissions;
}
