'use client';

import type { MissionContext, Part, PathwayId, Tier } from '@/game/types';

const TIER_STYLES: Readonly<Record<Tier, string>> = {
  simple: 'border-white/20 text-muted bg-white/5',
  standard: 'border-accent/40 text-accent bg-accent/10',
  advanced: 'border-[#b48cff]/50 text-[#b48cff] bg-[#b48cff]/10',
};

function extraStats(part: Part, pathwayId: PathwayId): string[] {
  switch (part.category) {
    case 'bus':
      return [
        `Max ${part.maxMass.toLocaleString('en-US')} kg`,
        `${part.instrumentSlots} inst. slot${part.instrumentSlots === 1 ? '' : 's'}`,
        ...(part.crewCapacity > 0 ? [`${part.crewCapacity} crew · ${part.maxCrewDays} d`] : []),
      ];
    case 'power':
      return [part.source === 'rtg' ? `RTG ${part.output.toLocaleString('en-US')} W` : `Solar ${part.output.toLocaleString('en-US')} W @ 1 AU`];
    case 'battery':
      return [`${part.energyWh.toLocaleString('en-US')} Wh`, `${part.lifeYears} yr life`];
    case 'computer':
      return [
        part.autonomy ? 'Autonomous' : 'Ground-controlled',
        `${part.radToleranceKrad} krad`,
        `${part.lifeYears} yr life`,
      ];
    case 'adcs':
      return [`Pointing L${part.pointing}`, part.nearEarthOnly ? 'Near-Earth only' : 'Deep space ready'];
    case 'comms':
      return [`${part.rateAt1AU} Mbps @ 1 AU`, `Max ${part.maxRate} Mbps`];
    case 'propulsion':
      return [`Isp ${part.isp} s`, `Tank ${part.fuelCapacity.toLocaleString('en-US')} kg`];
    case 'radiation':
      return [
        `Elec. −${Math.round(part.electronicsAttenuation * 100)}%`,
        ...(part.crewAttenuation > 0 ? [`Crew −${Math.round(part.crewAttenuation * 100)}%`] : []),
      ];
    case 'thermal':
      return [
        part.coldRated ? 'Cold-rated' : 'Inner system',
        ...(part.cooling ? ['Cryo-cooling (+30% sci)'] : []),
      ];
    case 'lifeSupport':
      return [`Recycling ${Math.round(part.recycling * 100)}%`];
    case 'habitat':
      return [
        part.kind === 'spin' ? `Spin arm (+${part.massPerMetre} kg/m)` : 'Exercise countermeasure',
        `Protects ${Math.round(part.protection * 100)}%`,
      ];
    case 'heatShield':
      return [`Rated ${part.entrySpeedRating} km/s`];
    case 'instrument': {
      const fit = part.fit[pathwayId] ?? part.defaultFit;
      return [
        `+${part.science} base sci (×${fit} fit)`,
        `${part.dataPerDay} Gb/day`,
        `Pointing L${part.needsPointing}`,
      ];
    }
  }
}

export interface PartCardProps {
  part: Part;
  mission: MissionContext;
  equipped: boolean;
  incompatibleReason: string | null;
  onAction: () => void;
}

export function PartCard({
  part,
  mission,
  equipped,
  incompatibleReason,
  onAction,
}: PartCardProps) {
  const specs = extraStats(part, mission.pathway.id);
  const disabled = !equipped && incompatibleReason !== null;

  return (
    <article
      aria-label={part.name}
      className={`flex flex-col justify-between rounded-xl border p-3.5 transition ${
        equipped
          ? 'border-ok bg-ok/10 shadow-[0_0_16px_rgb(76_240_160/0.15)]'
          : disabled
            ? 'border-line/60 bg-black/20 opacity-65'
            : 'border-line bg-black/30 hover:border-accent/70'
      }`}
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-bold text-ink">{part.name}</h4>
          <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${TIER_STYLES[part.tier]}`}>
            {part.tier}
          </span>
        </div>

        <p className="mt-1 text-xs leading-relaxed text-muted">{part.description}</p>

        {/* Core resource stats */}
        <div className="mt-2.5 flex flex-wrap gap-1.5 font-mono text-xs">
          <span className="rounded bg-white/5 px-1.5 py-0.5 text-ink">
            {part.mass.toLocaleString('en-US')} kg
          </span>
          <span className="rounded bg-white/5 px-1.5 py-0.5 text-ink">
            ${part.cost.toLocaleString('en-US')}M
          </span>
          {part.powerDraw > 0 && (
            <span className="rounded bg-white/5 px-1.5 py-0.5 text-ink">
              {part.powerDraw.toLocaleString('en-US')} W
            </span>
          )}
          {specs.map((spec) => (
            <span key={spec} className="rounded bg-accent/10 px-1.5 py-0.5 text-accent">
              {spec}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-3 pt-2 border-t border-line/60">
        {disabled && incompatibleReason ? (
          <p className="text-xs font-medium text-warn" role="note">
            ⚠ {incompatibleReason}
          </p>
        ) : null}

        <div className="mt-1.5 flex items-center justify-end">
          <button
            type="button"
            disabled={disabled}
            onClick={onAction}
            className={`rounded-lg border px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40 ${
              equipped
                ? part.category === 'bus'
                  ? 'border-ok bg-ok/20 text-ok'
                  : 'border-warn/70 bg-warn/15 text-warn hover:bg-warn/25'
                : 'border-accent bg-accent/15 text-ink hover:bg-accent/30'
            }`}
          >
            {equipped ? (part.category === 'bus' ? '✓ Selected Bus' : 'Remove') : 'Equip'}
          </button>
        </div>
      </div>
    </article>
  );
}
