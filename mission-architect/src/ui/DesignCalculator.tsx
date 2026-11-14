'use client';

import { useState } from 'react';

import { physics } from '@/game';
import { SPIN_TARGET_ACCELERATION, type DesignSummary } from '@/game/sim/design';
import type { MissionContext } from '@/game/types';

import { Button } from './Button';

type CalcTab = 'deltav' | 'power' | 'comms' | 'spin';

export interface DesignCalculatorProps {
  summary: DesignSummary;
  mission: MissionContext;
  onClose: () => void;
  onApplyFuel?: (fuelMass: number) => void;
  onApplySpinArm?: (armLength: number) => void;
}

export function DesignCalculator({
  summary,
  mission,
  onClose,
  onApplyFuel,
  onApplySpinArm,
}: DesignCalculatorProps) {
  const [tab, setTab] = useState<CalcTab>('deltav');

  // Δv calculator state (defaults from current design)
  const [isp, setIsp] = useState<number>(summary.resolved.propulsion?.isp ?? 320);
  const [dryMass, setDryMass] = useState<number>(Math.max(100, Math.round(summary.dryMass || 1000)));
  const [fuelMass, setFuelMass] = useState<number>(Math.round(summary.fuelMass || 500));

  // Power calculator state
  const [power1AU, setPower1AU] = useState<number>(
    summary.resolved.power?.source === 'solar' ? summary.resolved.power.output : 3000,
  );
  const [sunAU, setSunAU] = useState<number>(mission.env.sunDistanceAU);

  // Comms calculator state
  const [rate1AU, setRate1AU] = useState<number>(summary.resolved.comms?.rateAt1AU ?? 3);
  const maxRate = summary.resolved.comms?.maxRate ?? 150;
  const [earthAU, setEarthAU] = useState<number>(mission.env.earthDistanceAU);

  // Spin calculator state
  const [armRadius, setArmRadius] = useState<number>(
    summary.resolved.habitat?.kind === 'spin' ? Math.max(10, Math.round(summary.spinArmMass / 20 || 50)) : 50,
  );
  const [targetAccel, setTargetAccel] = useState<number>(SPIN_TARGET_ACCELERATION);

  const wetMass = dryMass + fuelMass;
  const computedDv = physics.deltaV(isp, wetMass, dryMass);
  const neededDvWithMargin = Math.ceil(mission.env.deltaV * 1.1);
  const requiredFuel = Math.ceil(physics.propellantFor(neededDvWithMargin, isp, dryMass));

  const sunFrac = physics.sunlightFraction(Math.max(0.1, sunAU));
  const powerAtDist = physics.solarPowerAt(power1AU, Math.max(0.1, sunAU)) * (1 - mission.env.eclipseFraction);

  const downlinkMbps = physics.downlinkRateMbps(rate1AU, maxRate, Math.max(1e-6, earthAU));
  const downlinkGbDay = physics.dataPerDayGb(downlinkMbps, mission.env.contactHoursPerDay);

  const computedRpm = physics.spinRpm(targetAccel, Math.max(1, armRadius));
  const comfort = physics.spinComfort(computedRpm);

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="design-calc-title"
    >
      <div className="hud-enter pointer-events-auto w-full max-w-2xl rounded-2xl border border-accent/50 bg-panel p-5 shadow-2xl backdrop-blur">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Physics Design Tools</p>
            <h2 id="design-calc-title" className="mt-0.5 text-2xl font-bold text-ink">
              Engineering Calculator
            </h2>
          </div>
          <Button variant="secondary" className="px-4 py-1.5 text-xs" onClick={onClose}>
            CLOSE
          </Button>
        </div>

        {/* Tabs */}
        <div className="mt-4 flex flex-wrap gap-2 border-b border-line pb-3" role="tablist">
          {(
            [
              ['deltav', 'Rocket Equation (Δv)'],
              ['power', 'Solar Inverse-Square'],
              ['comms', 'Radio Downlink'],
              ['spin', 'Centripetal Spin (RPM)'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
                tab === id
                  ? 'border-accent bg-accent/20 text-ink'
                  : 'border-line bg-black/25 text-muted hover:border-accent/50 hover:text-ink'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'deltav' && (
          <div className="mt-4 space-y-4">
            <p className="rounded-lg border border-line bg-black/30 px-3 py-2 font-mono text-sm text-accent">
              Δv = Isp · g₀ · ln(m_wet / m_dry) &nbsp; (g₀ = {physics.G0} m/s²)
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-xs">
                <span className="font-semibold text-muted">Engine Isp (s)</span>
                <input
                  type="number"
                  min={50}
                  max={2000}
                  value={isp}
                  onChange={(e) => setIsp(Math.max(1, Number(e.target.value)))}
                  className="mt-1 w-full rounded border border-line bg-black/40 px-2.5 py-1.5 font-mono text-sm text-ink"
                />
              </label>
              <label className="block text-xs">
                <span className="font-semibold text-muted">Dry mass m_dry (kg)</span>
                <input
                  type="number"
                  min={10}
                  max={500000}
                  value={dryMass}
                  onChange={(e) => setDryMass(Math.max(1, Number(e.target.value)))}
                  className="mt-1 w-full rounded border border-line bg-black/40 px-2.5 py-1.5 font-mono text-sm text-ink"
                />
              </label>
              <label className="block text-xs">
                <span className="font-semibold text-muted">Propellant m_fuel (kg)</span>
                <input
                  type="number"
                  min={0}
                  max={200000}
                  value={fuelMass}
                  onChange={(e) => setFuelMass(Math.max(0, Number(e.target.value)))}
                  className="mt-1 w-full rounded border border-line bg-black/40 px-2.5 py-1.5 font-mono text-sm text-ink"
                />
              </label>
            </div>
            <div className="rounded-xl border border-line bg-black/25 p-3.5 font-mono text-sm">
              <p className="text-ink">
                Computed Δv: <strong className="text-accent">{Math.round(computedDv).toLocaleString('en-US')} m/s</strong> ({(computedDv / 1000).toFixed(2)} km/s)
              </p>
              <p className="mt-1 text-xs text-muted">
                Mission requires {mission.env.deltaV} m/s ({neededDvWithMargin} m/s with 10% ERB margin). Ideal propellant for {dryMass.toLocaleString('en-US')} kg dry mass:{' '}
                <strong className="text-ink">{requiredFuel.toLocaleString('en-US')} kg</strong>.
              </p>
              {onApplyFuel && (
                <div className="mt-3 flex justify-end">
                  <Button
                    variant="secondary"
                    className="px-4 py-1.5 text-xs"
                    onClick={() => {
                      setFuelMass(requiredFuel);
                      onApplyFuel(requiredFuel);
                    }}
                  >
                    LOAD {requiredFuel.toLocaleString('en-US')} KG INTO TANK
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'power' && (
          <div className="mt-4 space-y-4">
            <p className="rounded-lg border border-line bg-black/30 px-3 py-2 font-mono text-sm text-accent">
              P(r) = (P₀ / r²) · (1 − f_eclipse)
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs">
                <span className="font-semibold text-muted">1 AU Solar Output P₀ (W)</span>
                <input
                  type="number"
                  min={0}
                  max={100000}
                  value={power1AU}
                  onChange={(e) => setPower1AU(Math.max(0, Number(e.target.value)))}
                  className="mt-1 w-full rounded border border-line bg-black/40 px-2.5 py-1.5 font-mono text-sm text-ink"
                />
              </label>
              <label className="block text-xs">
                <span className="font-semibold text-muted">Distance from Sun r (AU)</span>
                <input
                  type="number"
                  step="0.1"
                  min={0.1}
                  max={150}
                  value={sunAU}
                  onChange={(e) => setSunAU(Math.max(0.1, Number(e.target.value)))}
                  className="mt-1 w-full rounded border border-line bg-black/40 px-2.5 py-1.5 font-mono text-sm text-ink"
                />
              </label>
            </div>
            <div className="rounded-xl border border-line bg-black/25 p-3.5 font-mono text-sm">
              <p className="text-ink">
                Sunlight intensity: <strong className="text-accent">{(sunFrac * 100).toFixed(sunFrac < 0.1 ? 2 : 0)}%</strong> of Earth
              </p>
              <p className="mt-1 text-ink">
                Average power at {sunAU} AU: <strong className="text-accent">{Math.round(powerAtDist).toLocaleString('en-US')} W</strong>
              </p>
              <p className="mt-1 text-xs text-muted">
                Current spacecraft load: {Math.round(summary.powerLoad)} W (needs {Math.ceil(summary.powerLoad * 1.15)} W with 15% margin).
              </p>
            </div>
          </div>
        )}

        {tab === 'comms' && (
          <div className="mt-4 space-y-4">
            <p className="rounded-lg border border-line bg-black/30 px-3 py-2 font-mono text-sm text-accent">
              R(d) = min(R_max, R_1AU / d²) · Daily = R · t_contact · 3.6 Gb/day
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs">
                <span className="font-semibold text-muted">Rate at 1 AU (Mbps)</span>
                <input
                  type="number"
                  step="0.1"
                  min={0.0001}
                  max={100}
                  value={rate1AU}
                  onChange={(e) => setRate1AU(Math.max(0.0001, Number(e.target.value)))}
                  className="mt-1 w-full rounded border border-line bg-black/40 px-2.5 py-1.5 font-mono text-sm text-ink"
                />
              </label>
              <label className="block text-xs">
                <span className="font-semibold text-muted">Distance to Earth d (AU)</span>
                <input
                  type="number"
                  step="0.1"
                  min={0.000001}
                  max={150}
                  value={earthAU}
                  onChange={(e) => setEarthAU(Math.max(0.000001, Number(e.target.value)))}
                  className="mt-1 w-full rounded border border-line bg-black/40 px-2.5 py-1.5 font-mono text-sm text-ink"
                />
              </label>
            </div>
            <div className="rounded-xl border border-line bg-black/25 p-3.5 font-mono text-sm">
              <p className="text-ink">
                Downlink rate: <strong className="text-accent">{downlinkMbps.toFixed(downlinkMbps < 1 ? 4 : 2)} Mbps</strong>
              </p>
              <p className="mt-1 text-ink">
                Daily volume ({mission.env.contactHoursPerDay} h/day):{' '}
                <strong className="text-accent">{downlinkGbDay.toFixed(downlinkGbDay < 1 ? 3 : 1)} Gb/day</strong>
              </p>
              <p className="mt-1 text-xs text-muted">
                Current instruments generate {summary.dataPerDay.toFixed(summary.dataPerDay < 1 ? 3 : 1)} Gb/day.
              </p>
            </div>
          </div>
        )}

        {tab === 'spin' && (
          <div className="mt-4 space-y-4">
            <p className="rounded-lg border border-line bg-black/30 px-3 py-2 font-mono text-sm text-accent">
              a_c = ω² · r &nbsp; ⇒ &nbsp; RPM = (60 / 2π) · √(a_c / r)
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs">
                <span className="font-semibold text-muted">Spin Arm Radius r (m)</span>
                <input
                  type="number"
                  min={5}
                  max={200}
                  value={armRadius}
                  onChange={(e) => setArmRadius(Math.max(1, Number(e.target.value)))}
                  className="mt-1 w-full rounded border border-line bg-black/40 px-2.5 py-1.5 font-mono text-sm text-ink"
                />
              </label>
              <label className="block text-xs">
                <span className="font-semibold text-muted">Target Gravity a_c (m/s²)</span>
                <input
                  type="number"
                  step="0.1"
                  min={1}
                  max={9.81}
                  value={targetAccel}
                  onChange={(e) => setTargetAccel(Math.max(0.5, Number(e.target.value)))}
                  className="mt-1 w-full rounded border border-line bg-black/40 px-2.5 py-1.5 font-mono text-sm text-ink"
                />
              </label>
            </div>
            <div className="rounded-xl border border-line bg-black/25 p-3.5 font-mono text-sm">
              <p className="text-ink">
                Spin rate: <strong className="text-accent">{computedRpm.toFixed(2)} RPM</strong> · Comfort:{' '}
                <strong className={comfort === 'comfortable' ? 'text-ok' : comfort === 'adaptation' ? 'text-warn' : 'text-danger'}>
                  {comfort}
                </strong>
              </p>
              <p className="mt-1 text-xs text-muted">
                ≤ 4 RPM is comfortable; 4–6 RPM needs adaptation; &gt; 6 RPM causes motion sickness. At Mars gravity (3.73 m/s²), an arm of ≥ 22 m stays ≤ 4 RPM.
              </p>
              {onApplySpinArm && (
                <div className="mt-3 flex justify-end">
                  <Button
                    variant="secondary"
                    className="px-4 py-1.5 text-xs"
                    onClick={() => onApplySpinArm(armRadius)}
                  >
                    SET ARM TO {armRadius} M
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
