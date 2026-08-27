export const BRASILIA_TIMEZONE = "America/Sao_Paulo";

export function formatReleaseDate(date: string | null | undefined, released: boolean | null | undefined) {
  if (!date) return "—";

  const formatted = new Date(date).toLocaleString("pt-BR", {
    timeZone: BRASILIA_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return released ? `${formatted} (liberado)` : `${formatted} (previsto)`;
}
