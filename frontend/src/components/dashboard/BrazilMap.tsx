'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import brazilMapData from '@svg-maps/brazil';
import { stateNameToUf } from '@/utils/brazilStates';
import { useTheme } from '@/hooks/useTheme';
import type { CustomersByStateRow } from '@/types/dashboard';

interface BrazilMapLocation {
  id: string;
  name: string;
  path: string;
}

interface BrazilMapProps {
  data: CustomersByStateRow[];
}

interface StateBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

const brazilMap = brazilMapData as unknown as { viewBox: string; locations: BrazilMapLocation[] };

const EMPTY_FILL = '#EFF4FB';
const PRIMARY_RGB = '60, 80, 224';

const [viewMinX, viewMinY, viewWidth, viewHeight] = brazilMap.viewBox.split(' ').map(Number);
const mapCenterX = viewMinX + viewWidth / 2;
const mapCenterY = viewMinY + viewHeight / 2;
const SMALL_STATE_THRESHOLD = viewWidth * 0.06;
const LEADER_OFFSET = viewWidth * 0.14;

export function BrazilMap({ data }: BrazilMapProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [boxes, setBoxes] = useState<Record<string, StateBox>>({});
  const pathRefs = useRef<Record<string, SVGPathElement | null>>({});
  const { theme } = useTheme();

  const totalsByUf = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of data) {
      const uf = stateNameToUf(row.state);
      if (uf) map.set(uf, (map.get(uf) ?? 0) + row.total);
    }
    return map;
  }, [data]);

  const maxTotal = useMemo(() => Math.max(1, ...Array.from(totalsByUf.values())), [totalsByUf]);

  const ranked = useMemo(
    () =>
      brazilMap.locations
        .map((location) => ({ location, total: totalsByUf.get(location.id) ?? 0 }))
        .filter((row) => row.total > 0)
        .sort((a, b) => b.total - a.total),
    [totalsByUf],
  );

  useEffect(() => {
    const next: Record<string, StateBox> = {};
    for (const [id, el] of Object.entries(pathRefs.current)) {
      if (!el) continue;
      const box = el.getBBox();
      next[id] = { x: box.x, y: box.y, width: box.width, height: box.height };
    }
    setBoxes(next);
  }, [data]);

  if (totalsByUf.size === 0) {
    return (
      <p className="text-sm text-body dark:text-bodydark">Sem dados de localização no período.</p>
    );
  }

  const textColor = theme === 'dark' ? '#ffffff' : '#3C50E0';
  const haloColor = theme === 'dark' ? '#1A222C' : '#ffffff';

  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-center">
      <div className="relative flex-1">
      <svg viewBox={brazilMap.viewBox} className="mx-auto h-auto w-full max-w-md overflow-visible">
        {brazilMap.locations.map((location) => {
          const total = totalsByUf.get(location.id) ?? 0;
          const opacity = total === 0 ? 1 : 0.15 + 0.85 * (total / maxTotal);

          return (
            <path
              key={location.id}
              ref={(el) => {
                pathRefs.current[location.id] = el;
              }}
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

        {brazilMap.locations.map((location) => {
          const total = totalsByUf.get(location.id) ?? 0;
          const box = boxes[location.id];
          if (total === 0 || !box) return null;

          const cx = box.x + box.width / 2;
          const cy = box.y + box.height / 2;
          const isSmall = box.width < SMALL_STATE_THRESHOLD || box.height < SMALL_STATE_THRESHOLD;

          if (!isSmall) {
            return (
              <text
                key={`label-${location.id}`}
                x={cx}
                y={cy}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={14}
                fontWeight={700}
                fill={textColor}
                stroke={haloColor}
                strokeWidth={3}
                paintOrder="stroke"
                pointerEvents="none"
              >
                {total}
              </text>
            );
          }

          // Estado pequeno demais pro número caber dentro: joga o rótulo pra
          // fora, na direção radial a partir do centro do mapa, com uma
          // linha guia até o estado correspondente.
          const dx = cx - mapCenterX;
          const dy = cy - mapCenterY;
          const distance = Math.hypot(dx, dy) || 1;
          const dirX = dx / distance;
          const dirY = dy / distance;
          const labelX = cx + dirX * LEADER_OFFSET;
          const labelY = cy + dirY * LEADER_OFFSET;

          return (
            <g key={`label-${location.id}`} pointerEvents="none">
              <line
                x1={cx}
                y1={cy}
                x2={labelX}
                y2={labelY}
                stroke={textColor}
                strokeWidth={1}
              />
              <circle cx={cx} cy={cy} r={2} fill={textColor} />
              <text
                x={labelX}
                y={labelY}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={14}
                fontWeight={700}
                fill={textColor}
                stroke={haloColor}
                strokeWidth={3}
                paintOrder="stroke"
              >
                {total}
              </text>
            </g>
          );
        })}
      </svg>

      {hovered && (
        <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 rounded-sm border border-stroke bg-white px-3 py-1.5 text-xs font-medium text-black shadow-1 dark:border-strokedark dark:bg-boxdark dark:text-white">
          {brazilMap.locations.find((l) => l.id === hovered)?.name}: {totalsByUf.get(hovered) ?? 0}
        </div>
      )}
      </div>

      <ol
        style={{ paddingRight: 20 }}
        className="grid w-full grid-cols-2 gap-x-4 gap-y-1.5 md:w-80"
      >
        {ranked.map((row, index) => (
          <li
            key={row.location.id}
            className="flex items-center justify-between gap-2 text-sm text-black dark:text-white"
          >
            <span className="flex items-center gap-2 truncate">
              <span className="text-xs text-body dark:text-bodydark">{index + 1}.</span>
              {row.location.name}
            </span>
            <span className="font-semibold text-primary">{row.total}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
