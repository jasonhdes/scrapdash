import { apiFetch } from "@/services/api";
import type { Employee, ModulePermissions } from "@/types/employee";

export function listEmployees(accountId: number, token: string) {
  return apiFetch<{ data: Employee[] }>(`/accounts/${accountId}/employees`, { token });
}

export interface CreateEmployeePayload {
  name: string;
  email: string;
  password: string;
  permissions: ModulePermissions;
}

export function createEmployee(accountId: number, payload: CreateEmployeePayload, token: string) {
  return apiFetch<{ data: Employee }>(`/accounts/${accountId}/employees`, {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export function updateEmployeePermissions(
  accountId: number,
  employeeId: number,
  permissions: ModulePermissions,
  token: string,
) {
  return apiFetch<{ data: Employee }>(`/accounts/${accountId}/employees/${employeeId}`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ permissions }),
  });
}

export function removeEmployee(accountId: number, employeeId: number, token: string) {
  return apiFetch<void>(`/accounts/${accountId}/employees/${employeeId}`, {
    method: "DELETE",
    token,
  });
}
