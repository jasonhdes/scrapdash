import type { ModulePermissions } from "@/types/employee";

export interface Account {
  id: number;
  name: string;
  marketplace: string;
  mercadolivre_connected: boolean;
  permissions: ModulePermissions;
}
