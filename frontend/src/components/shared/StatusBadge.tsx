const STATUS_COLORS: Record<string, string> = {
  active: 'bg-success/10 text-success',
  approved: 'bg-success/10 text-success',
  paid: 'bg-success/10 text-success',
  paused: 'bg-warning/10 text-warning',
  pending: 'bg-warning/10 text-warning',
  under_review: 'bg-warning/10 text-warning',
  in_mediation: 'bg-warning/10 text-warning',
  cancelled: 'bg-danger/10 text-danger',
  rejected: 'bg-danger/10 text-danger',
  inactive: 'bg-danger/10 text-danger',
  refunded: 'bg-meta-5/10 text-meta-5',
  partially_refunded: 'bg-meta-5/10 text-meta-5',
};

const DEFAULT_COLOR = 'bg-bodydark/20 text-bodydark2 dark:text-bodydark';

interface StatusBadgeProps {
  status: string | null;
  labels?: Record<string, string>;
  colors?: Record<string, string>;
}

export function StatusBadge({ status, labels, colors }: StatusBadgeProps) {
  if (!status) return <>—</>;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${colors?.[status] ?? STATUS_COLORS[status] ?? DEFAULT_COLOR}`}
    >
      {labels?.[status] ?? status}
    </span>
  );
}
