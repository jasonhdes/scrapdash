import styles from "@/styles/list.module.css";

interface PaginationProps {
  currentPage: number;
  lastPage: number;
  total: number;
  onChange: (page: number) => void;
}

export function Pagination({ currentPage, lastPage, total, onChange }: PaginationProps) {
  if (lastPage <= 1) return null;

  return (
    <div className={styles.pagination}>
      <button
        className={styles.pageButton}
        disabled={currentPage <= 1}
        onClick={() => onChange(currentPage - 1)}
      >
        Anterior
      </button>
      <span>
        Página {currentPage} de {lastPage} ({total} no total)
      </span>
      <button
        className={styles.pageButton}
        disabled={currentPage >= lastPage}
        onClick={() => onChange(currentPage + 1)}
      >
        Próxima
      </button>
    </div>
  );
}
