'use client';

import dynamic from 'next/dynamic';
import type { ApexOptions } from 'apexcharts';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

const PALETTE = ['#3C50E0', '#219653', '#FFA70B', '#D34053', '#259AE6', '#8A99AF'];

interface StatusDonutChartProps {
  title: string;
  byStatus: Record<string, number>;
  labels?: Record<string, string>;
  statusColors?: Record<string, string>;
  total?: number;
  totalLabel?: string;
}

export function StatusDonutChart({
  title,
  byStatus,
  labels,
  statusColors,
  total,
  totalLabel,
}: StatusDonutChartProps) {
  const entries = Object.entries(byStatus).filter(([, value]) => value > 0);

  const header = (
    <div className="mb-4 flex items-start justify-between gap-2">
      <h3 className="text-lg font-semibold text-black dark:text-white">{title}</h3>
      {total !== undefined && (
        <div style={{ paddingRight: 12 }} className="text-right">
          {totalLabel && (
            <span className="block text-xs text-body dark:text-bodydark">{totalLabel}</span>
          )}
          <span className="block text-lg font-bold text-black dark:text-white">{total}</span>
        </div>
      )}
    </div>
  );

  if (entries.length === 0) {
    return (
      <div className="rounded-sm border border-stroke bg-white px-5 pb-5 pt-7.5 shadow-1 dark:border-strokedark dark:bg-boxdark sm:px-7.5">
        {header}
        <p className="text-sm text-body dark:text-bodydark">Sem dados no período.</p>
      </div>
    );
  }

  const colors = entries.map(([status], index) => statusColors?.[status] ?? PALETTE[index % PALETTE.length]);

  const options: ApexOptions = {
    chart: { type: 'donut', fontFamily: 'inherit' },
    labels: entries.map(([status]) => labels?.[status] ?? status),
    colors,
    legend: { position: 'bottom', labels: { colors: '#64748B' } },
    dataLabels: {
      enabled: true,
      formatter: (_value, opts) => `${opts?.w.config.series?.[opts.seriesIndex]}`,
      style: { fontSize: '13px', fontWeight: 600 },
    },
    plotOptions: { pie: { donut: { size: '70%' } } },
  };

  return (
    <div
      style={{ paddingLeft: 20 }}
      className="rounded-sm border border-stroke bg-white px-5 pb-5 pt-7.5 shadow-1 dark:border-strokedark dark:bg-boxdark sm:px-7.5"
    >
      {header}
      <Chart
        options={options}
        series={entries.map(([, value]) => value)}
        type="donut"
        height={280}
      />
    </div>
  );
}
