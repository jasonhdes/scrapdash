export function formatReleaseDate(date: string | null | undefined, released: boolean | null | undefined) {
  if (!date) return "—";

  const formatted = new Date(date).toLocaleDateString("pt-BR");

  return released ? `${formatted} (liberado)` : `${formatted} (previsto)`;
}
