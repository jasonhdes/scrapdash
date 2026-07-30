'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAccounts } from '@/hooks/useAccounts';
import {
  createEmployee,
  listEmployees,
  removeEmployee,
  updateEmployeePermissions,
} from '@/services/employees';
import type { Employee, ModulePermissions } from '@/types/employee';
import { AccountSelector } from '@/components/dashboard/AccountSelector';
import { PermissionGrid } from '@/components/employees/PermissionGrid';
import { ApiError } from '@/services/api';

const EMPTY_FORM = { name: '', email: '', password: '', permissions: {} as ModulePermissions };

const inputClass =
  'rounded-lg border border-stroke bg-transparent px-4 py-2 text-sm text-black outline-none focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary';

export default function EmployeesPage() {
  const { user, token } = useAuth();
  const { accounts, selectedAccountId, setSelectedAccountId } = useAccounts(token);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);

  const loadEmployees = useCallback(async () => {
    if (!selectedAccountId || !token) return;
    setIsLoading(true);
    try {
      const { data } = await listEmployees(selectedAccountId, token);
      setEmployees(data);
    } finally {
      setIsLoading(false);
    }
  }, [selectedAccountId, token]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedAccountId || !token) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await createEmployee(selectedAccountId, form, token);
      setForm(EMPTY_FORM);
      await loadEmployees();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível criar o funcionário.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePermissionsChange(employee: Employee, permissions: ModulePermissions) {
    if (!selectedAccountId || !token) return;
    setEmployees((prev) => prev.map((e) => (e.id === employee.id ? { ...e, permissions } : e)));
    setSavingId(employee.id);
    try {
      await updateEmployeePermissions(selectedAccountId, employee.id, permissions, token);
    } finally {
      setSavingId(null);
    }
  }

  async function handleRemove(employee: Employee) {
    if (!selectedAccountId || !token) return;
    setEmployees((prev) => prev.filter((e) => e.id !== employee.id));
    await removeEmployee(selectedAccountId, employee.id, token);
  }

  if (!user) return null;

  if (user.role === 'user_partner') {
    return (
      <div className="flex flex-col gap-5">
        <p className="text-sm text-body dark:text-bodydark">
          Você não tem acesso à gestão de funcionários desta conta.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-title-md font-bold text-black dark:text-white">Funcionários</h1>
          <p className="mt-1 text-sm text-body dark:text-bodydark">
            Acesso e permissões de quem trabalha com você.
          </p>
        </div>
        <AccountSelector
          accounts={accounts}
          selectedId={selectedAccountId}
          onChange={setSelectedAccountId}
        />
      </div>

      <form
        onSubmit={handleCreate}
        className="flex flex-col gap-4 rounded-sm border border-stroke bg-white p-6 shadow-1 dark:border-strokedark dark:bg-boxdark"
      >
        <h2 className="text-lg font-semibold text-black dark:text-white">Adicionar funcionário</h2>
        <div className="flex flex-wrap gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="text-sm font-medium text-black dark:text-white">
              Nome
            </label>
            <input
              id="name"
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-black dark:text-white">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-black dark:text-white">
              Senha
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className={inputClass}
            />
          </div>
        </div>

        <PermissionGrid
          value={form.permissions}
          onChange={(permissions) => setForm((f) => ({ ...f, permissions }))}
        />

        {error && <p className="text-sm text-danger">{error}</p>}

        <div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {isSubmitting ? 'Adicionando...' : 'Adicionar'}
          </button>
        </div>
      </form>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-black dark:text-white">
          Equipe com acesso a esta conta
        </h2>

        {isLoading ? (
          <p className="text-sm text-body dark:text-bodydark">Carregando...</p>
        ) : employees.length === 0 ? (
          <p className="text-sm text-body dark:text-bodydark">
            Nenhum funcionário com acesso a esta conta ainda.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {employees.map((employee) => (
              <div
                key={employee.id}
                className="flex flex-wrap items-start justify-between gap-4 rounded-sm border border-stroke bg-white p-4 shadow-1 dark:border-strokedark dark:bg-boxdark"
              >
                <div className="flex flex-col gap-0.5">
                  <strong className="text-black dark:text-white">{employee.name}</strong>
                  <span className="text-sm text-body dark:text-bodydark">{employee.email}</span>
                </div>
                <PermissionGrid
                  value={employee.permissions}
                  disabled={savingId === employee.id}
                  onChange={(permissions) => handlePermissionsChange(employee, permissions)}
                />
                <div className="flex flex-col items-end gap-2">
                  {savingId === employee.id && (
                    <span className="text-sm text-body dark:text-bodydark">Salvando...</span>
                  )}
                  <button
                    onClick={() => handleRemove(employee)}
                    className="rounded-lg border border-stroke px-4 py-2 text-sm font-medium text-danger dark:border-strokedark"
                  >
                    Remover acesso
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
