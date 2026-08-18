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
