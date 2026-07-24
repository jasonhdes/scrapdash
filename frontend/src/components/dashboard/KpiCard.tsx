import styles from "@/styles/dashboard.module.css";

interface KpiCardProps {
  label: string;
  value: string | number;
  hint?: string;
}

export function KpiCard({ label, value, hint }: KpiCardProps) {
  return (
    <div className={styles.card}>
      <span className={styles.cardLabel}>{label}</span>
      <span className={styles.cardValue}>{value}</span>
      {hint && <span className={styles.cardHint}>{hint}</span>}
    </div>
  );
}
