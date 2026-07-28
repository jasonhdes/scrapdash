export const BRASILIA_TIMEZONE = "America/Sao_Paulo";

export function formatReleaseDate(date: string | null | undefined, released: boolean | null | undefined) {
  if (!date) return "—";

  const formatted = new Date(date).toLocaleDateString("pt-BR", { timeZone: BRASILIA_TIMEZONE });

  return released ? `${formatted} (liberado)` : `${formatted} (previsto)`;
}
