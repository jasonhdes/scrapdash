import type { Account } from "@/types/account";
import styles from "@/styles/dashboard.module.css";

interface AccountSelectorProps {
  accounts: Account[];
  selectedId: number | null;
  onChange: (accountId: number) => void;
}

export function AccountSelector({ accounts, selectedId, onChange }: AccountSelectorProps) {
  if (accounts.length <= 1) {
    return null;
  }

  return (
    <select
      className={styles.select}
      value={selectedId ?? ""}
      onChange={(e) => onChange(Number(e.target.value))}
    >
      {accounts.map((account) => (
        <option key={account.id} value={account.id}>
          {account.name}
        </option>
      ))}
    </select>
  );
}
