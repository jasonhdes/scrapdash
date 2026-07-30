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
import listStyles from '@/styles/list.module.css';
import styles from '@/styles/employees.module.css';

const EMPTY_FORM = { name: '', email: '', password: '', permissions: {} as ModulePermissions };

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
      <div className={listStyles.container}>
        <p className={listStyles.subtitle}>
          Você não tem acesso à gestão de funcionários desta conta.
        </p>
      </div>
    );
  }

  return (
    <div className={listStyles.container}>
      <div className={listStyles.header}>
        <div>
          <h1 className={listStyles.title}>Funcionários</h1>
          <p className={listStyles.subtitle}>Acesso e permissões de quem trabalha com você.</p>
        </div>
        <AccountSelector
          accounts={accounts}
          selectedId={selectedAccountId}
          onChange={setSelectedAccountId}
        />
      </div>

      <form className={styles.form} onSubmit={handleCreate}>
        <h2 className={listStyles.title} style={{ fontSize: '1rem' }}>
          Adicionar funcionário
        </h2>
        <div className={styles.formRow}>
          <div className={styles.field}>
            <label htmlFor="name">Nome</label>
            <input
              id="name"
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
          </div>
        </div>

        <PermissionGrid
          value={form.permissions}
          onChange={(permissions) => setForm((f) => ({ ...f, permissions }))}
        />

        {error && <p className={listStyles.subtitle}>{error}</p>}

        <div>
          <button type="submit" className={listStyles.pageButton} disabled={isSubmitting}>
            {isSubmitting ? 'Adicionando...' : 'Adicionar'}
          </button>
        </div>
      </form>

      <div className={listStyles.section}>
        <h2 className={listStyles.title} style={{ fontSize: '1rem' }}>
          Equipe com acesso a esta conta
        </h2>

        {isLoading ? (
          <p className={listStyles.subtitle}>Carregando...</p>
        ) : employees.length === 0 ? (
          <p className={listStyles.subtitle}>Nenhum funcionário com acesso a esta conta ainda.</p>
        ) : (
          employees.map((employee) => (
            <div key={employee.id} className={styles.employeeCard}>
              <div className={styles.employeeInfo}>
                <strong>{employee.name}</strong>
                <span className={listStyles.subtitle}>{employee.email}</span>
              </div>
              <PermissionGrid
                value={employee.permissions}
                disabled={savingId === employee.id}
                onChange={(permissions) => handlePermissionsChange(employee, permissions)}
              />
              <div className={styles.employeeActions}>
                {savingId === employee.id && (
                  <span className={listStyles.subtitle}>Salvando...</span>
                )}
                <button className={listStyles.pageButton} onClick={() => handleRemove(employee)}>
                  Remover acesso
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
