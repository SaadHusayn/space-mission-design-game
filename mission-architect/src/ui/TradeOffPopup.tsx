'use client';

import { ROLES, type RoleId } from '@/game/core/crew';
import type { DecisionDelta, DecisionLogEntry } from '@/game/types';

const DELTA_UNITS: Readonly<Record<DecisionDelta, { label: string; format: (v: number) => string; goodPositive: boolean }>> = {
  science: {
    label: 'science',
    format: (v) => `${v > 0 ? '+' : '−'}${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 1 })} science`,
    goodPositive: true,
  },
  deltaV: {
    label: 'Δv',
    format: (v) => `${v > 0 ? '+' : '−'}${Math.abs(Math.round(v)).toLocaleString('en-US')} m/s Δv`,
    goodPositive: true,
  },
  mass: {
    label: 'mass',
    format: (v) => `${v > 0 ? '+' : '−'}${Math.abs(Math.round(v)).toLocaleString('en-US')} kg`,
    goodPositive: false,
  },
  power: {
    label: 'power',
    format: (v) => `${v > 0 ? '+' : '−'}${Math.abs(Math.round(v)).toLocaleString('en-US')} W load`,
    goodPositive: false,
  },
  data: {
    label: 'data',
    format: (v) => `${v > 0 ? '+' : '−'}${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 3 })} Gb/day`,
    goodPositive: true,
  },
  cost: {
    label: 'cost',
    format: (v) => `${v > 0 ? '+$' : '−$'}${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 1 })}M`,
    goodPositive: false,
  },
};

const ACTION_VERBS: Readonly<Record<string, string>> = {
  bus: 'Selected bus:',
  equip: 'Equipped:',
  unequip: 'Removed:',
  addInstrument: 'Added instrument:',
  removeInstrument: 'Removed instrument:',
  option: 'Adjusted:',
};

export function TradeOffPopup({ entry }: { entry: DecisionLogEntry | null }) {
  if (!entry) return null;

  const keys = (Object.keys(DELTA_UNITS) as DecisionDelta[]).filter(
    (k) => entry.deltas[k] !== undefined && Math.abs(entry.deltas[k]!) > 1e-6,
  );
  const role = ROLES[entry.actor as RoleId];

  return (
    <div
      className="hud-enter pointer-events-auto rounded-xl border border-accent/40 bg-panel px-4 py-2.5 backdrop-blur"
      role="status"
      aria-live="polite"
      aria-label="Latest engineering trade-off"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-ink">
          <span className="text-muted">{ACTION_VERBS[entry.kind] ?? 'Changed:'}</span>{' '}
          <span className="text-accent">{entry.partName}</span>
        </span>
        {role && (
          <span className="font-mono text-[11px]" style={{ color: role.colour }}>
            Logged by {role.name}
          </span>
        )}
      </div>

      {keys.length > 0 ? (
        <div className="mt-1.5 flex flex-wrap gap-1.5 font-mono text-xs">
          {keys.map((key) => {
            const val = entry.deltas[key]!;
            const spec = DELTA_UNITS[key];
            const isPositive = val > 0;
            const tone =
              spec.goodPositive === isPositive
                ? 'border-ok/40 bg-ok/10 text-ok'
                : 'border-warn/40 bg-warn/10 text-warn';
            return (
              <span key={key} className={`rounded border px-2 py-0.5 ${tone}`}>
                {spec.format(val)}
              </span>
            );
          })}
        </div>
      ) : (
        <p className="mt-1 font-mono text-xs text-muted">No net resource change</p>
      )}
    </div>
  );
}
