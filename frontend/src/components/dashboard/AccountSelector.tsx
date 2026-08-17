import type { Account } from '@/types/account';

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
      value={selectedId ?? ''}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{ paddingLeft: 16 }}
      className="rounded-lg border border-stroke bg-transparent py-2 pr-4 text-sm text-black outline-none focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
    >
      {accounts.map((account) => (
        <option key={account.id} value={account.id}>
          {account.name}
        </option>
      ))}
    </select>
  );
}
