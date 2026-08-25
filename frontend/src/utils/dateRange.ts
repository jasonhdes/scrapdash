function toDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

/**
 * Intervalo padrão dos filtros de data do app quando nada foi selecionado
 * ainda: do dia 1 do mês corrente até hoje.
 */
export function getCurrentMonthRange() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);

  return {
    startDate: toDateString(firstDay),
    endDate: toDateString(now),
  };
}

/**
 * Intervalo (primeiro ao último dia) de um mês específico no formato
 * "YYYY-MM" — usado na página de detalhe de um mês em Relatórios.
 */
export function getMonthRange(month: string) {
  const [year, monthIndex] = month.split('-').map(Number);
  const firstDay = new Date(year, monthIndex - 1, 1);
  const lastDay = new Date(year, monthIndex, 0);

  return {
    startDate: toDateString(firstDay),
    endDate: toDateString(lastDay),
  };
}
