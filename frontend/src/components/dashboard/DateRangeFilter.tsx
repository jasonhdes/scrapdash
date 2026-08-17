interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onChange: (range: { startDate: string; endDate: string }) => void;
  onClear: () => void;
}

const inputClass =
  'rounded-lg border border-stroke bg-transparent py-2 pr-4 text-sm text-black outline-none focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary';
const inputPaddingLeft = { paddingLeft: 16 };

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
          style={inputPaddingLeft}
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
          style={inputPaddingLeft}
          className={inputClass}
        />
      </div>
      {(startDate || endDate) && (
        <button
          onClick={onClear}
          style={{ paddingLeft: 5, paddingRight: 5 }}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90"
        >
          Limpar período
        </button>
      )}
    </div>
  );
}
