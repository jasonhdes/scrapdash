'use client';

import dynamic from 'next/dynamic';
import type { ApexOptions } from 'apexcharts';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

const PALETTE = ['#3C50E0', '#219653', '#FFA70B', '#D34053', '#259AE6', '#8A99AF'];

interface StatusDonutChartProps {
  title: string;
  byStatus: Record<string, number>;
  labels?: Record<string, string>;
}

export function StatusDonutChart({ title, byStatus, labels }: StatusDonutChartProps) {
  const entries = Object.entries(byStatus).filter(([, total]) => total > 0);

  if (entries.length === 0) {
    return (
      <div className="rounded-sm border border-stroke bg-white px-5 pb-5 pt-7.5 shadow-1 dark:border-strokedark dark:bg-boxdark sm:px-7.5">
        <h3 className="mb-4 text-lg font-semibold text-black dark:text-white">{title}</h3>
        <p className="text-sm text-body dark:text-bodydark">Sem dados no período.</p>
      </div>
    );
  }

  const options: ApexOptions = {
    chart: { type: 'donut', fontFamily: 'inherit' },
    labels: entries.map(([status]) => labels?.[status] ?? status),
    colors: PALETTE,
    legend: { position: 'bottom', labels: { colors: '#64748B' } },
    dataLabels: { enabled: false },
    plotOptions: { pie: { donut: { size: '70%' } } },
  };

  return (
    <div className="rounded-sm border border-stroke bg-white px-5 pb-5 pt-7.5 shadow-1 dark:border-strokedark dark:bg-boxdark sm:px-7.5">
      <h3 className="mb-4 text-lg font-semibold text-black dark:text-white">{title}</h3>
      <Chart
        options={options}
        series={entries.map(([, total]) => total)}
        type="donut"
        height={280}
      />
    </div>
  );
}
