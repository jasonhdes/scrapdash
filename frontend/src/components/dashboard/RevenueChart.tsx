'use client';

import dynamic from 'next/dynamic';
import type { ApexOptions } from 'apexcharts';
import type { RevenueSeriesPoint } from '@/types/dashboard';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

function formatCurrency(value: number, currency: string | null) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency ?? 'BRL',
  }).format(value);
}

function formatShortDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });
}

interface RevenueChartProps {
  series: RevenueSeriesPoint[];
  currency: string | null;
}

export function RevenueChart({ series, currency }: RevenueChartProps) {
  const options: ApexOptions = {
    chart: {
      type: 'area',
      toolbar: { show: false },
      fontFamily: 'inherit',
    },
    colors: ['#3C50E0'],
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    fill: {
      type: 'gradient',
      gradient: { opacityFrom: 0.35, opacityTo: 0 },
    },
    grid: { borderColor: '#E2E8F0', strokeDashArray: 4 },
    xaxis: {
      categories: series.map((point) => formatShortDate(point.date)),
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
      series={[{ name: 'Receita', data: series.map((point) => point.revenue) }]}
      type="area"
      height={300}
    />
  );
}
