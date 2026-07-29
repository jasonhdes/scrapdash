export type PermissionModule = "products" | "orders" | "financial" | "messages";
export type PermissionAction = "view" | "manage";

export type ModulePermissions = Partial<Record<PermissionModule, PermissionAction[]>>;

export interface Employee {
  id: number;
  name: string;
  email: string;
  permissions: ModulePermissions;
  created_at: string;
}
