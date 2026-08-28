import type { OrderReturnStatus } from '@/types/orderReturn';

export const RETURN_STATUS_LABELS: Record<OrderReturnStatus, string> = {
  pecas_devolvidas: 'Peças devolvidas',
  comprou_cancelou: 'Comprou e cancelou',
  valor_retido: 'Valor retido',
  estorno_valor: 'Cliente reembolsado',
  reembolso: 'Reembolso',
  desconto_venda: 'Desconto de venda',
  desconto_frete: 'Desconto de frete',
  venda_balcao: 'Venda balcão',
};

export const RETURN_STATUS_BADGE_COLORS: Record<OrderReturnStatus, string> = {
  pecas_devolvidas: 'bg-danger/10 text-danger',
  comprou_cancelou: 'bg-warning/10 text-warning',
  valor_retido: 'bg-[#8B5CF6]/10 text-[#8B5CF6]',
  estorno_valor: 'bg-meta-5/10 text-meta-5',
  reembolso: 'bg-meta-6/10 text-meta-6',
  desconto_venda: 'bg-bodydark/20 text-bodydark2 dark:text-bodydark',
  desconto_frete: 'bg-bodydark/20 text-bodydark2 dark:text-bodydark',
  venda_balcao: 'bg-success/10 text-success',
};
