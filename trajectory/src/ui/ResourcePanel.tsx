import type { DesignSummary } from '@/game/sim/design';
import type { MissionContext } from '@/game/types';

type Tone = 'ok' | 'warn' | 'bad';

interface Row {
  id: string;
  label: string;
  value: string;
  limit: string;
  /** How full the bar is, 0..1 (can exceed 1 when over a limit). */
  fill: number;
  tone: Tone;
  delta?: string;
}

const TONE_CLASS: Record<Tone, string> = { ok: 'bg-ok', warn: 'bg-warn', bad: 'bg-danger' };
const TONE_ICON: Record<Tone, string> = { ok: '✓', warn: '⚠', bad: '✗' };

const n = (value: number, digits = 0) => value.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits });

function delta(now: number, before: number | undefined, unit: string, digits = 0): string | undefined {
  if (before === undefined) return undefined;
  const change = now - before;
  if (Math.abs(change) < 10 ** -digits / 2) return undefined;
  return `${change > 0 ? '+' : '−'}${n(Math.abs(change), digits)}${unit}`;
}

/** Usage rows: lower is better (mass, cost, load). */
function usage(used: number, limit: number): Tone {
  if (used > limit) return 'bad';
  return used > limit * 0.9 ? 'warn' : 'ok';
}

/** Supply rows: higher is better (power, Δv, downlink). */
function supply(have: number, need: number, margin: number): Tone {
  if (have < need) return 'bad';
  return have < need * margin ? 'warn' : 'ok';
}

export function buildRows(summary: DesignSummary, mission: MissionContext, before?: DesignSummary): Row[] {
  const bus = summary.resolved.bus;
  const massLimit = Math.min(bus?.maxMass ?? Infinity, summary.launchCapacity ?? Infinity);
  const rows: Row[] = [
    {
      id: 'mass',
      label: 'Mass',
      value: `${n(summary.wetMass)} kg`,
      limit: Number.isFinite(massLimit) ? `/ ${n(massLimit)} kg` : 'no bus',
      fill: Number.isFinite(massLimit) ? summary.wetMass / massLimit : 0,
      tone: Number.isFinite(massLimit) ? usage(summary.wetMass, massLimit) : 'warn',
      delta: delta(summary.wetMass, before?.wetMass, ' kg'),
    },
    {
      id: 'power',
      label: 'Power',
      value: `${n(summary.powerLoad)} W used`,
      limit: `/ ${n(summary.powerAvailable)} W`,
      fill: summary.powerAvailable > 0 ? summary.powerLoad / summary.powerAvailable : 1,
      tone: supply(summary.powerAvailable, summary.powerLoad, 1.15),
      delta: delta(summary.powerAvailable, before?.powerAvailable, ' W available'),
    },
    {
      id: 'budget',
      label: 'Budget',
      value: `$${n(summary.totalCost)}M`,
      limit: `/ $${n(mission.budget)}M`,
      fill: summary.totalCost / mission.budget,
      tone: usage(summary.totalCost, mission.budget),
      delta: delta(summary.totalCost, before?.totalCost, 'M', 0)?.replace(/^([+−])/, '$1$'),
    },
    {
      id: 'data',
      label: 'Data',
      value: `${n(summary.dataPerDay, summary.dataPerDay < 1 ? 3 : 1)} Gb/day`,
      limit: `downlink ${n(summary.downlinkPerDay, summary.downlinkPerDay < 1 ? 3 : 0)}`,
      fill: summary.downlinkPerDay > 0 ? summary.dataPerDay / summary.downlinkPerDay : summary.dataPerDay > 0 ? 1.2 : 0,
      tone: summary.dataDelivered >= 0.999 ? 'ok' : summary.dataDelivered >= 0.6 ? 'warn' : 'bad',
    },
    {
      id: 'deltav',
      label: 'Δv',
      value: `${n(summary.deltaV / 1000, 2)} km/s`,
      limit: `/ ${n(summary.deltaVRequired / 1000, 2)} needed`,
      fill: summary.deltaVRequired > 0 ? Math.min(1.2, summary.deltaV / (summary.deltaVRequired * 1.1)) : 1,
      tone: supply(summary.deltaV, summary.deltaVRequired, 1.1),
      delta: delta(summary.deltaV, before?.deltaV, ' m/s'),
    },
    {
      id: 'time',
      label: 'Lifetime',
      value: Number.isFinite(summary.designLifeYears) ? `${n(summary.designLifeYears, 1)} yr` : '—',
      limit: `/ ${n(summary.years, 1)} yr mission`,
      fill: summary.years > 0 ? Math.min(1, summary.designLifeYears / summary.years) : 1,
      tone: supply(summary.designLifeYears, summary.years, 1),
    },
    {
      id: 'science',
      label: 'Science',
      value: n(summary.science),
      limit: `/ ${mission.pathway.scienceTarget} goal`,
      fill: Math.min(1, summary.science / mission.pathway.scienceTarget),
      tone: summary.science >= mission.pathway.scienceTarget ? 'ok' : summary.science >= mission.pathway.scienceTarget * 0.8 ? 'warn' : 'bad',
      delta: delta(summary.science, before?.science, ''),
    },
  ];
  return rows;
}

/** The mission's resources: value, limit, a bar, status icon and the change from the last design. */
export function ResourcePanel({ summary, mission, before, title = 'Mission resources' }: { summary: DesignSummary; mission: MissionContext; before?: DesignSummary; title?: string }) {
  const rows = buildRows(summary, mission, before);
  return (
    <div className="rounded-2xl border border-line bg-panel p-4 backdrop-blur" role="region" aria-label={title}>
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-accent">{title}</p>
      <ul className="mt-2 space-y-2.5">
        {rows.map((row) => (
          <li key={row.id}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-semibold uppercase tracking-[0.14em] text-muted">
                <span aria-label={row.tone === 'ok' ? 'OK' : row.tone === 'warn' ? 'Warning' : 'Problem'} className={row.tone === 'ok' ? 'text-ok' : row.tone === 'warn' ? 'text-warn' : 'text-danger'}>
                  {TONE_ICON[row.tone]}
                </span>{' '}
                {row.label}
              </span>
              <span className="font-mono text-ink">
                {row.value} <span className="text-muted">{row.limit}</span>
                {row.delta && <span className="ml-2 rounded bg-warn/15 px-1.5 text-warn">{row.delta}</span>}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className={`h-full rounded-full transition-[width] duration-500 ${TONE_CLASS[row.tone]}`} style={{ width: `${Math.min(100, row.fill * 100)}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
