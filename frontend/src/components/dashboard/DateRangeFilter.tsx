interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onChange: (range: { startDate: string; endDate: string }) => void;
  onClear: () => void;
}

const inputClass =
  'rounded-lg border border-stroke bg-transparent px-4 py-2 text-sm text-black outline-none focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary';

export function DateRangeFilter({ startDate, endDate, onChange, onClear }: DateRangeFilterProps) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="start_date" className="text-sm font-medium text-black dark:text-white">
          De
        </label>
        <input
          id="start_date"
          type="date"
          value={startDate}
          max={endDate || undefined}
          onChange={(e) => onChange({ startDate: e.target.value, endDate })}
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="end_date" className="text-sm font-medium text-black dark:text-white">
          Até
        </label>
        <input
          id="end_date"
          type="date"
          value={endDate}
          min={startDate || undefined}
          onChange={(e) => onChange({ startDate, endDate: e.target.value })}
          className={inputClass}
        />
      </div>
      {(startDate || endDate) && (
        <button onClick={onClear} className="text-sm font-medium text-primary">
          Limpar período
        </button>
      )}
    </div>
  );
}
