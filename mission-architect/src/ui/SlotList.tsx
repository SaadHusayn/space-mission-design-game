'use client';

import { getPart, SLOT_ACTOR, SLOT_IDS, slotApplicable } from '@/game';
import { ROLES, type RoleId } from '@/game/core/crew';
import type { Design, MissionContext, SlotId } from '@/game/types';
import { type AssemblyTarget } from '@/scenes/Hangar/assemblyStore';

export const SLOT_LABELS: Readonly<Record<AssemblyTarget, string>> = {
  bus: 'Spacecraft Bus',
  power: 'Power Source',
  battery: 'Battery',
  computer: 'Flight Computer',
  adcs: 'Attitude Control',
  comms: 'Communications',
  propulsion: 'Propulsion',
  radiation: 'Radiation Shield',
  thermal: 'Thermal Control',
  lifeSupport: 'Life Support',
  habitat: 'Crew Habitat',
  heatShield: 'Heat Shield',
  instruments: 'Science Instruments',
};

export interface SlotListProps {
  design: Design;
  mission: MissionContext;
  selectedTarget: AssemblyTarget;
  onSelectTarget: (target: AssemblyTarget) => void;
  onChangeOption: (key: 'fuelMass' | 'supplyDays' | 'spinArmLength', value: number) => void;
}

export function SlotList({
  design,
  mission,
  selectedTarget,
  onSelectTarget,
  onChangeOption,
}: SlotListProps) {
  const busPart = design.busId ? getPart(design.busId) : null;
  const busSlots = busPart?.category === 'bus' ? busPart.instrumentSlots : 0;
  const propPart = design.slots.propulsion ? getPart(design.slots.propulsion) : null;
  const maxFuel = propPart?.category === 'propulsion' ? propPart.fuelCapacity : 0;
  const habPart = design.slots.habitat ? getPart(design.slots.habitat) : null;
  const isSpinHab = habPart?.category === 'habitat' && habPart.kind === 'spin';

  const targets: AssemblyTarget[] = [
    'bus',
    ...SLOT_IDS.filter((slot) => slotApplicable(slot, mission)),
    'instruments',
  ];

  const getStatusText = (target: AssemblyTarget): { filled: boolean; text: string } => {
    if (target === 'bus') {
      return busPart ? { filled: true, text: busPart.name } : { filled: false, text: 'Empty — choose a frame' };
    }
    if (target === 'instruments') {
      const count = design.instrumentIds.length;
      if (count === 0) return { filled: false, text: busSlots > 0 ? `0 / ${busSlots} fitted` : 'Need a bus first' };
      const names = design.instrumentIds.map((id) => getPart(id).name).join(', ');
      return { filled: true, text: `${count}${busSlots > 0 ? `/${busSlots}` : ''}: ${names}` };
    }
    const partId = design.slots[target as SlotId];
    if (!partId) {
      // Radiation and habitat are optional on some missions, mark accordingly
      return { filled: false, text: 'Not equipped' };
    }
    return { filled: true, text: getPart(partId).name };
  };

  return (
    <aside
      className="pointer-events-auto flex max-h-full flex-col overflow-hidden rounded-2xl border border-line bg-panel p-3.5 backdrop-blur"
       aria-label="Spacecraft subsystems"
    >
      <div className="flex items-center justify-between gap-2 pb-2">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Subsystems</p>
        <span className="text-xs text-muted">Click to inspect / equip</span>
      </div>

      <ul className="space-y-1.5 overflow-y-auto pr-1">
        {targets.map((target) => {
          const { filled, text } = getStatusText(target);
          const active = selectedTarget === target;
          const roleId = SLOT_ACTOR[target] as RoleId;
          const role = ROLES[roleId];

          return (
            <li key={target}>
              <button
                type="button"
                onClick={() => onSelectTarget(target)}
                aria-current={active ? 'true' : undefined}
                className={`w-full rounded-xl border px-3 py-2 text-left transition focus-visible:outline-2 focus-visible:outline-accent ${
                  active
                    ? 'border-accent bg-accent/15 text-ink shadow-[0_0_16px_rgb(92_225_255/0.2)]'
                    : 'border-line bg-black/25 text-ink hover:border-accent/60'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">
                    <span
                      className={`mr-1.5 inline-block font-bold ${filled ? 'text-ok' : 'text-warn'}`}
                      aria-label={filled ? 'Equipped' : 'Empty'}
                    >
                      {filled ? '✓' : '○'}
                    </span>
                    {SLOT_LABELS[target]}
                  </span>
                  {role && (
                    <span
                      className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                      style={{ color: role.colour, backgroundColor: `${role.colour}1f` }}
                    >
                      {role.short}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate pl-4 text-xs text-muted">{text}</p>
              </button>
            </li>
          );
        })}
      </ul>

      {/* Mission configuration sliders (propellant, supplies, spin arm) */}
      <div className="mt-3 space-y-2.5 border-t border-line pt-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Load & Configuration</p>

        {/* Fuel Mass */}
        <div>
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="fuel-mass-input" className="font-semibold text-ink">
              Propellant (kg)
            </label>
            <span className="font-mono text-muted">
              {design.options.fuelMass.toLocaleString('en-US')} / {maxFuel.toLocaleString('en-US')} kg
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <input
              id="fuel-mass-input"
              type="range"
              min={0}
              max={Math.max(100, maxFuel)}
              step={maxFuel > 5000 ? 50 : 5}
              disabled={maxFuel === 0}
              value={Math.min(design.options.fuelMass, maxFuel)}
              onChange={(e) => onChangeOption('fuelMass', Number(e.target.value))}
              className="w-full accent-accent disabled:opacity-40"
            />
            <input
              type="number"
              aria-label="Propellant mass in kg"
              min={0}
              max={maxFuel}
              disabled={maxFuel === 0}
              value={design.options.fuelMass}
              onChange={(e) => onChangeOption('fuelMass', Number(e.target.value))}
              className="w-20 rounded border border-line bg-black/40 px-2 py-0.5 font-mono text-xs text-ink disabled:opacity-40"
            />
          </div>
        </div>

        {/* Crew Supplies */}
        {mission.pathway.crewed && (
          <div>
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="supply-days-input" className="font-semibold text-ink">
                Crew Supplies (days)
              </label>
              <span className="font-mono text-muted">{design.options.supplyDays} days</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <input
                id="supply-days-input"
                type="range"
                min={0}
                max={730}
                step={1}
                value={design.options.supplyDays}
                onChange={(e) => onChangeOption('supplyDays', Number(e.target.value))}
                className="w-full accent-accent"
              />
              <input
                type="number"
                aria-label="Crew supplies in days"
                min={0}
                max={730}
                value={design.options.supplyDays}
                onChange={(e) => onChangeOption('supplyDays', Number(e.target.value))}
                className="w-20 rounded border border-line bg-black/40 px-2 py-0.5 font-mono text-xs text-ink"
              />
            </div>
          </div>
        )}

        {/* Spin Habitat Arm */}
        {mission.pathway.crewed && isSpinHab && (
          <div>
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="spin-arm-input" className="font-semibold text-ink">
                Spin Arm Length (m)
              </label>
              <span className="font-mono text-muted">{design.options.spinArmLength} m</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <input
                id="spin-arm-input"
                type="range"
                min={0}
                max={200}
                step={5}
                value={design.options.spinArmLength}
                onChange={(e) => onChangeOption('spinArmLength', Number(e.target.value))}
                className="w-full accent-accent"
              />
              <input
                type="number"
                aria-label="Spin habitat arm length in metres"
                min={0}
                max={200}
                value={design.options.spinArmLength}
                onChange={(e) => onChangeOption('spinArmLength', Number(e.target.value))}
                className="w-20 rounded border border-line bg-black/40 px-2 py-0.5 font-mono text-xs text-ink"
              />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
