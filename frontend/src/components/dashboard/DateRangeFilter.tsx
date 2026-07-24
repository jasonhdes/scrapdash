import styles from "@/styles/dashboard.module.css";

interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onChange: (range: { startDate: string; endDate: string }) => void;
  onClear: () => void;
}

export function DateRangeFilter({ startDate, endDate, onChange, onClear }: DateRangeFilterProps) {
  return (
    <div className={styles.dateFilter}>
      <div className={styles.dateField}>
        <label htmlFor="start_date">De</label>
        <input
          id="start_date"
          type="date"
          value={startDate}
          max={endDate || undefined}
          onChange={(e) => onChange({ startDate: e.target.value, endDate })}
        />
      </div>
      <div className={styles.dateField}>
        <label htmlFor="end_date">Até</label>
        <input
          id="end_date"
          type="date"
          value={endDate}
          min={startDate || undefined}
          onChange={(e) => onChange({ startDate, endDate: e.target.value })}
        />
      </div>
      {(startDate || endDate) && (
        <button className={styles.linkButton} onClick={onClear}>
          Limpar período
        </button>
      )}
    </div>
  );
}
