import type { ModulePermissions, PermissionAction, PermissionModule } from "@/types/employee";
import styles from "@/styles/employees.module.css";

const MODULES: { key: PermissionModule; label: string }[] = [
  { key: "products", label: "Produtos" },
  { key: "orders", label: "Pedidos" },
  { key: "financial", label: "Financeiro" },
  { key: "messages", label: "Mensagens" },
];

const ACTIONS: { key: PermissionAction; label: string }[] = [
  { key: "view", label: "Ver" },
  { key: "manage", label: "Gerenciar" },
];

interface PermissionGridProps {
  value: ModulePermissions;
  onChange: (value: ModulePermissions) => void;
  disabled?: boolean;
}

export function PermissionGrid({ value, onChange, disabled }: PermissionGridProps) {
  function toggle(module: PermissionModule, action: PermissionAction) {
    const current = value[module] ?? [];
    const next = current.includes(action) ? current.filter((a) => a !== action) : [...current, action];
    onChange({ ...value, [module]: next });
  }

  return (
    <table className={styles.permissionGrid}>
      <thead>
        <tr>
          <th></th>
          {ACTIONS.map((action) => (
            <th key={action.key}>{action.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {MODULES.map((module) => (
          <tr key={module.key}>
            <th>{module.label}</th>
            {ACTIONS.map((action) => (
              <td key={action.key}>
                <input
                  type="checkbox"
                  disabled={disabled}
                  checked={(value[module.key] ?? []).includes(action.key)}
                  onChange={() => toggle(module.key, action.key)}
                />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
