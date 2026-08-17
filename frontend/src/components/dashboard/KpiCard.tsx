interface KpiCardProps {
  label: string;
  value: string | number;
  hint?: string;
}

export function KpiCard({ label, value, hint }: KpiCardProps) {
  return (
    <div className="flex flex-col items-center rounded-sm border border-stroke bg-white px-5 py-5 text-center shadow-1 dark:border-strokedark dark:bg-boxdark sm:px-7.5">
      <span className="text-sm font-medium text-body dark:text-bodydark">{label}</span>
      <span className="mt-2 block text-title-md font-bold text-black dark:text-white">{value}</span>
      {hint && <span className="mt-1 block text-xs text-body dark:text-bodydark">{hint}</span>}
    </div>
  );
}
