import { useMemo } from 'react';
import { MapToken } from './MapCanvas';
import { getDistanceFt } from '@/lib/types';
import { Spell } from '@/lib/spells';

export interface AoeState {
  spell: Spell;
  casterToken: MapToken;
  /** Placed center in map-pixel coords; null = following mouse */
  placedX: number | null;
  placedY: number | null;
}

interface AoeOverlayProps {
  aoe: AoeState;
  /** Current mouse position in map-pixel coords */
  mouseX: number;
  mouseY: number;
  gridSize: number;
  ftPerCell: number;
  allTokens: MapToken[];
  imgSize: { w: number; h: number };
}

/** Convert feet to pixels */
function ftToPx(ft: number, gridSize: number, ftPerCell: number) {
  return (ft / ftPerCell) * gridSize;
}

/** Get tokens inside the AoE */
export function getAoeTargets(
  spell: Spell,
  cx: number,
  cy: number,
  casterToken: MapToken,
  allTokens: MapToken[],
  gridSize: number,
  ftPerCell: number,
): { token: MapToken; isFriendly: boolean }[] {
  const radiusFt = spell.aoeRadius || spell.aoeLength || 20;
  const radiusPx = ftToPx(radiusFt, gridSize, ftPerCell);

  return allTokens
    .filter(t => {
      if (t.hp !== undefined && t.hp <= 0) return false;
      const dx = t.x - cx;
      const dy = t.y - cy;

      if (spell.targetType === 'aoe-sphere' || spell.targetType === 'aoe-cube') {
        if (spell.targetType === 'aoe-cube') {
          return Math.abs(dx) <= radiusPx && Math.abs(dy) <= radiusPx;
        }
        return Math.sqrt(dx * dx + dy * dy) <= radiusPx;
      }
      if (spell.targetType === 'aoe-cone') {
        const lengthPx = ftToPx(spell.aoeLength || 15, gridSize, ftPerCell);
        const angle = Math.atan2(cy - casterToken.y, cx - casterToken.x);
        const tokenAngle = Math.atan2(t.y - casterToken.y, t.x - casterToken.x);
        const dist = Math.sqrt((t.x - casterToken.x) ** 2 + (t.y - casterToken.y) ** 2);
        let diff = Math.abs(tokenAngle - angle);
        if (diff > Math.PI) diff = 2 * Math.PI - diff;
        return dist <= lengthPx && diff <= Math.PI / 6; // ~53° cone
      }
      if (spell.targetType === 'aoe-line') {
        const lengthPx = ftToPx(spell.aoeLength || 30, gridSize, ftPerCell);
        const widthPx = ftToPx(spell.aoeWidth || 5, gridSize, ftPerCell);
        const angle = Math.atan2(cy - casterToken.y, cx - casterToken.x);
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const relX = t.x - casterToken.x;
        const relY = t.y - casterToken.y;
        const along = relX * cos + relY * sin;
        const perp = Math.abs(-relX * sin + relY * cos);
        return along >= 0 && along <= lengthPx && perp <= widthPx / 2;
      }
      return false;
    })
    .map(t => ({
      token: t,
      isFriendly: t.type === casterToken.type,
    }));
}

export function AoeOverlay({ aoe, mouseX, mouseY, gridSize, ftPerCell, allTokens, imgSize }: AoeOverlayProps) {
  const cx = aoe.placedX ?? mouseX;
  const cy = aoe.placedY ?? mouseY;
  const spell = aoe.spell;
  const isPlaced = aoe.placedX !== null;

  const affected = useMemo(() =>
    getAoeTargets(spell, cx, cy, aoe.casterToken, allTokens, gridSize, ftPerCell),
    [spell, cx, cy, aoe.casterToken, allTokens, gridSize, ftPerCell]
  );

  const hasFriendlyFire = affected.some(a => a.isFriendly);

  // Calculate shape params
  const radiusFt = spell.aoeRadius || spell.aoeLength || 20;
  const radiusPx = ftToPx(radiusFt, gridSize, ftPerCell);

  // Check range from caster
  const distFromCaster = Math.sqrt((cx - aoe.casterToken.x) ** 2 + (cy - aoe.casterToken.y) ** 2);
  const maxRangePx = spell.range <= 0 ? 0 : ftToPx(spell.range, gridSize, ftPerCell);
  const outOfRange = spell.range > 0 && distFromCaster > maxRangePx + radiusPx;

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={imgSize.w}
      height={imgSize.h}
      style={{ zIndex: 25 }}
    >
      {/* Range indicator from caster */}
      {spell.range > 0 && !isPlaced && (
        <circle
          cx={aoe.casterToken.x}
          cy={aoe.casterToken.y}
          r={maxRangePx}
          fill="none"
          stroke="hsl(var(--muted-foreground))"
          strokeWidth={1}
          strokeDasharray="6 4"
          opacity={0.3}
        />
      )}

      {/* AoE shape */}
      {(spell.targetType === 'aoe-sphere') && (
        <circle
          cx={cx}
          cy={cy}
          r={radiusPx}
          fill={outOfRange ? 'hsla(0, 60%, 50%, 0.15)' : hasFriendlyFire ? 'hsla(45, 90%, 50%, 0.2)' : 'hsla(0, 80%, 50%, 0.2)'}
          stroke={outOfRange ? 'hsl(0, 60%, 50%)' : hasFriendlyFire ? 'hsl(45, 90%, 50%)' : 'hsl(0, 80%, 50%)'}
          strokeWidth={2}
          strokeDasharray={isPlaced ? undefined : '4 3'}
        />
      )}
      {(spell.targetType === 'aoe-cube') && (
        <rect
          x={cx - radiusPx}
          y={cy - radiusPx}
          width={radiusPx * 2}
          height={radiusPx * 2}
          fill={outOfRange ? 'hsla(0, 60%, 50%, 0.15)' : hasFriendlyFire ? 'hsla(45, 90%, 50%, 0.2)' : 'hsla(0, 80%, 50%, 0.2)'}
          stroke={outOfRange ? 'hsl(0, 60%, 50%)' : hasFriendlyFire ? 'hsl(45, 90%, 50%)' : 'hsl(0, 80%, 50%)'}
          strokeWidth={2}
          strokeDasharray={isPlaced ? undefined : '4 3'}
        />
      )}
      {(spell.targetType === 'aoe-cone') && (() => {
        const lengthPx = ftToPx(spell.aoeLength || 15, gridSize, ftPerCell);
        const angle = Math.atan2(cy - aoe.casterToken.y, cx - aoe.casterToken.x);
        const halfAngle = Math.PI / 6;
        const x1 = aoe.casterToken.x + Math.cos(angle - halfAngle) * lengthPx;
        const y1 = aoe.casterToken.y + Math.sin(angle - halfAngle) * lengthPx;
        const x2 = aoe.casterToken.x + Math.cos(angle + halfAngle) * lengthPx;
        const y2 = aoe.casterToken.y + Math.sin(angle + halfAngle) * lengthPx;
        // Arc
        const arcX = aoe.casterToken.x + Math.cos(angle) * lengthPx;
        const arcY = aoe.casterToken.y + Math.sin(angle) * lengthPx;
        return (
          <path
            d={`M ${aoe.casterToken.x} ${aoe.casterToken.y} L ${x1} ${y1} A ${lengthPx} ${lengthPx} 0 0 1 ${x2} ${y2} Z`}
            fill={hasFriendlyFire ? 'hsla(45, 90%, 50%, 0.2)' : 'hsla(0, 80%, 50%, 0.2)'}
            stroke={hasFriendlyFire ? 'hsl(45, 90%, 50%)' : 'hsl(0, 80%, 50%)'}
            strokeWidth={2}
            strokeDasharray={isPlaced ? undefined : '4 3'}
          />
        );
      })()}
      {(spell.targetType === 'aoe-line') && (() => {
        const lengthPx = ftToPx(spell.aoeLength || 30, gridSize, ftPerCell);
        const widthPx = ftToPx(spell.aoeWidth || 5, gridSize, ftPerCell);
        const angle = Math.atan2(cy - aoe.casterToken.y, cx - aoe.casterToken.x);
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const perpX = -sin * widthPx / 2;
        const perpY = cos * widthPx / 2;
        const sx = aoe.casterToken.x;
        const sy = aoe.casterToken.y;
        const ex = sx + cos * lengthPx;
        const ey = sy + sin * lengthPx;
        return (
          <polygon
            points={`${sx + perpX},${sy + perpY} ${ex + perpX},${ey + perpY} ${ex - perpX},${ey - perpY} ${sx - perpX},${sy - perpY}`}
            fill={hasFriendlyFire ? 'hsla(45, 90%, 50%, 0.2)' : 'hsla(0, 80%, 50%, 0.2)'}
            stroke={hasFriendlyFire ? 'hsl(45, 90%, 50%)' : 'hsl(0, 80%, 50%)'}
            strokeWidth={2}
            strokeDasharray={isPlaced ? undefined : '4 3'}
          />
        );
      })()}

      {/* Highlight affected tokens */}
      {affected.map(({ token: t, isFriendly }) => (
        <circle
          key={t.id}
          cx={t.x}
          cy={t.y}
          r={14}
          fill="none"
          stroke={isFriendly ? 'hsl(45, 90%, 50%)' : 'hsl(0, 80%, 50%)'}
          strokeWidth={2.5}
          opacity={0.9}
        />
      ))}

      {/* Center crosshair */}
      {(spell.targetType === 'aoe-sphere' || spell.targetType === 'aoe-cube') && (
        <>
          <line x1={cx - 6} y1={cy} x2={cx + 6} y2={cy} stroke="hsl(var(--foreground))" strokeWidth={1} opacity={0.5} />
          <line x1={cx} y1={cy - 6} x2={cx} y2={cy + 6} stroke="hsl(var(--foreground))" strokeWidth={1} opacity={0.5} />
        </>
      )}
    </svg>
  );
}
