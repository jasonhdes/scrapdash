export const DEPOSIT_LABELS: Record<string, string> = {
  full: 'FULL',
  loja: 'LOJA',
};

export const DEPOSIT_COLORS: Record<string, string> = {
  full: 'bg-success/10 text-success',
};

export function depositKey(logisticType: string | null) {
  return logisticType === 'fulfillment' ? 'full' : 'loja';
}
