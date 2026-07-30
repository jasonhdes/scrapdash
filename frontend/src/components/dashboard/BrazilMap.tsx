'use client';

import { useMemo, useState } from 'react';
import brazilMapData from '@svg-maps/brazil';
import { stateNameToUf } from '@/utils/brazilStates';
import type { CustomersByStateRow } from '@/types/dashboard';

interface BrazilMapLocation {
  id: string;
  name: string;
  path: string;
}

interface BrazilMapProps {
  data: CustomersByStateRow[];
}

const brazilMap = brazilMapData as unknown as { viewBox: string; locations: BrazilMapLocation[] };

const EMPTY_FILL = '#EFF4FB';
const PRIMARY_RGB = '60, 80, 224';

export function BrazilMap({ data }: BrazilMapProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  const totalsByUf = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of data) {
      const uf = stateNameToUf(row.state);
      if (uf) map.set(uf, (map.get(uf) ?? 0) + row.total);
    }
    return map;
  }, [data]);

  const maxTotal = useMemo(() => Math.max(1, ...Array.from(totalsByUf.values())), [totalsByUf]);

  if (totalsByUf.size === 0) {
    return (
      <p className="text-sm text-body dark:text-bodydark">Sem dados de localização no período.</p>
    );
  }

  return (
    <div className="relative">
      <svg viewBox={brazilMap.viewBox} className="mx-auto h-auto w-full max-w-md">
        {brazilMap.locations.map((location) => {
          const total = totalsByUf.get(location.id) ?? 0;
          const opacity = total === 0 ? 1 : 0.15 + 0.85 * (total / maxTotal);

          return (
            <path
              key={location.id}
              d={location.path}
              fill={total === 0 ? EMPTY_FILL : `rgba(${PRIMARY_RGB}, ${opacity})`}
              stroke="#ffffff"
              strokeWidth={1}
              onMouseEnter={() => setHovered(location.id)}
              onMouseLeave={() =>
                setHovered((current) => (current === location.id ? null : current))
              }
            >
              <title>
                {location.name}: {total} pedido{total === 1 ? '' : 's'}
              </title>
            </path>
          );
        })}
      </svg>

      {hovered && (
        <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 rounded-sm border border-stroke bg-white px-3 py-1.5 text-xs font-medium text-black shadow-1 dark:border-strokedark dark:bg-boxdark dark:text-white">
          {brazilMap.locations.find((l) => l.id === hovered)?.name}: {totalsByUf.get(hovered) ?? 0}
        </div>
      )}
    </div>
  );
}
