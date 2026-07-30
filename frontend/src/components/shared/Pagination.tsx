interface PaginationProps {
  currentPage: number;
  lastPage: number;
  total: number;
  onChange: (page: number) => void;
}

export function Pagination({ currentPage, lastPage, total, onChange }: PaginationProps) {
  if (lastPage <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-3 pt-2">
      <button
        disabled={currentPage <= 1}
        onClick={() => onChange(currentPage - 1)}
        className="rounded-lg border border-stroke px-4 py-2 text-sm font-medium text-black disabled:opacity-40 dark:border-strokedark dark:text-white"
      >
        Anterior
      </button>
      <span className="text-sm text-body dark:text-bodydark">
        Página {currentPage} de {lastPage} ({total} no total)
      </span>
      <button
        disabled={currentPage >= lastPage}
        onClick={() => onChange(currentPage + 1)}
        className="rounded-lg border border-stroke px-4 py-2 text-sm font-medium text-black disabled:opacity-40 dark:border-strokedark dark:text-white"
      >
        Próxima
      </button>
    </div>
  );
}
