'use client';

import dynamic from 'next/dynamic';
import type { ApexOptions } from 'apexcharts';
import type { MonthlyReportRow } from '@/types/report';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value);
}

function formatMonthShort(month: string) {
  const label = new Date(`${month}-01T00:00:00`).toLocaleDateString('pt-BR', {
    month: 'short',
    year: '2-digit',
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// "Cancelamentos" = comprou e cancelou (o comprador desistiu logo após a
// compra); "Desconto de frete" tem série própria; "Devoluções" = as demais
// categorias (peças devolvidas, valor retido, estorno, desconto de venda) —
// mesma separação usada no resto do sistema, só resumida pro gráfico.
function cancelledTotal(row: MonthlyReportRow) {
  return row.returns_by_status['comprou_cancelou']?.total ?? 0;
}

function freightDiscountTotal(row: MonthlyReportRow) {
  return row.returns_by_status['desconto_frete']?.total ?? 0;
}

function returnsOnlyTotal(row: MonthlyReportRow) {
  return row.returns_total - cancelledTotal(row) - freightDiscountTotal(row);
}

interface MonthlyOverviewChartProps {
  rows: MonthlyReportRow[];
  currency: string;
}

export function MonthlyOverviewChart({ rows, currency }: MonthlyOverviewChartProps) {
  // A API devolve do mês mais recente pro mais antigo; o gráfico lê da
  // esquerda (mais antigo) pra direita (mais recente).
  const chronological = [...rows].reverse();

  const options: ApexOptions = {
    chart: { type: 'line', toolbar: { show: false }, zoom: { enabled: false }, fontFamily: 'inherit' },
    colors: ['#3C50E0', '#219653', '#FFA70B', '#D34053', '#8B5CF6'],
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    legend: { position: 'top', horizontalAlign: 'left' },
    grid: { borderColor: '#E2E8F0', strokeDashArray: 4 },
    xaxis: {
      categories: chronological.map((row) => formatMonthShort(row.month)),
      labels: { style: { colors: '#64748B', fontSize: '11px' } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: { colors: '#64748B', fontSize: '11px' },
        formatter: (value: number) => formatCurrency(value, currency),
      },
    },
    tooltip: {
      y: { formatter: (value: number) => formatCurrency(value, currency) },
    },
  };

  return (
    <Chart
      options={options}
      series={[
        { name: 'Receita bruta', data: chronological.map((row) => row.gross_revenue) },
        { name: 'Receita líquida', data: chronological.map((row) => row.net_revenue) },
        { name: 'Devoluções', data: chronological.map(returnsOnlyTotal) },
        { name: 'Cancelamentos', data: chronological.map(cancelledTotal) },
        { name: 'Desconto de frete', data: chronological.map(freightDiscountTotal) },
      ]}
      type="line"
      height={320}
    />
  );
}
