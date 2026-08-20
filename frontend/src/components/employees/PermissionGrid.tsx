import type { ModulePermissions, PermissionAction, PermissionModule } from '@/types/employee';

const MODULES: { key: PermissionModule; label: string }[] = [
  { key: 'products', label: 'Produtos' },
  { key: 'orders', label: 'Pedidos' },
  { key: 'financial', label: 'Financeiro' },
  { key: 'messages', label: 'Mensagens' },
  { key: 'returns', label: 'Devoluções' },
];

const ACTIONS: { key: PermissionAction; label: string }[] = [
  { key: 'view', label: 'Ver' },
  { key: 'manage', label: 'Gerenciar' },
];

interface PermissionGridProps {
  value: ModulePermissions;
  onChange: (value: ModulePermissions) => void;
  disabled?: boolean;
}

export function PermissionGrid({ value, onChange, disabled }: PermissionGridProps) {
  function toggle(module: PermissionModule, action: PermissionAction) {
    const current = value[module] ?? [];
    const next = current.includes(action)
      ? current.filter((a) => a !== action)
      : [...current, action];
    onChange({ ...value, [module]: next });
  }

  return (
    <table className="text-sm">
      <thead>
        <tr>
          <th></th>
          {ACTIONS.map((action) => (
            <th
              key={action.key}
              className="px-3 py-1 text-center font-medium text-body dark:text-bodydark"
            >
              {action.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {MODULES.map((module) => (
          <tr key={module.key}>
            <th className="whitespace-nowrap pr-3 text-left font-medium text-black dark:text-white">
              {module.label}
            </th>
            {ACTIONS.map((action) => (
              <td key={action.key} className="px-3 py-1 text-center">
                <input
                  type="checkbox"
                  disabled={disabled}
                  checked={(value[module.key] ?? []).includes(action.key)}
                  onChange={() => toggle(module.key, action.key)}
                  className="h-4 w-4 accent-primary disabled:opacity-40"
                />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
