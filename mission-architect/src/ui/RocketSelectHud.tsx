'use client';

import { useMemo, useState } from 'react';

import {
  createMission,
  gameData,
  generateChallenge,
  reviewDesign,
  summarizeDesign,
  vehicleHeightM,
} from '@/game';
import { fmt, kg, money } from '@/game/sim/format';
import type { LaunchVehicle } from '@/game/types';
import { useGame } from '@/hooks/useGame';

import { Button } from './Button';
import { PhysicsConsole } from './PhysicsConsole';
import { ResourcePanel } from './ResourcePanel';

interface EvaluatedVehicle {
  vehicle: LaunchVehicle;
  summary: ReturnType<typeof summarizeDesign>;
  review: ReturnType<typeof reviewDesign>;
  capacityOk: boolean;
  twrOk: boolean;
  gLoadOk: boolean;
  budgetOk: boolean;
  reasons: string[];
}

/**
 * LAUNCH_VEHICLE phase UI: Launch vehicle comparison cards, compatibility reasoning
 * (payload capacity, liftoff TWR, launch G-load, budget), and live ResourcePanel.
 */
export function RocketSelectHud() {
  const missionState = useGame((state) => state.mission);
  const design = useGame((state) => state.design);
  const vehicleId = useGame((state) => state.vehicleId);
  const difficulty = useGame((state) => state.profile.difficulty);
  const selectLaunchVehicle = useGame((state) => state.selectLaunchVehicle);
  const proceedToGoNoGo = useGame((state) => state.proceedToGoNoGo);
  const recordChallengeResult = useGame((state) => state.recordChallengeResult);
  const goTo = useGame((state) => state.goTo);
  const [showTwrQuiz, setShowTwrQuiz] = useState(false);

  const mission = useMemo(
    () => (missionState ? createMission(missionState.pathwayId, missionState.trajectoryId ?? undefined, difficulty) : null),
    [missionState, difficulty],
  );

  const evaluated = useMemo<EvaluatedVehicle[]>(() => {
    if (!mission || !design) return [];
    return gameData.launchVehicles.map((vehicle) => {
      const summary = summarizeDesign(design, mission, vehicle);
      const review = reviewDesign(design, mission, vehicle);
      const capacity = summary.launchCapacity ?? 0;
      const liftoffTwr = summary.liftoffTwr ?? 0;
      const busMaxG = summary.resolved.bus?.maxG ?? 0;

      const capacityOk = summary.wetMass <= capacity;
      const twrOk = liftoffTwr > 1.0;
      const gLoadOk = busMaxG >= vehicle.maxG;
      const budgetOk = summary.totalCost <= mission.budget;

      const reasons: string[] = [];
      if (!capacityOk) {
        reasons.push(
          `ERB-1L Overweight: Spacecraft wet mass (${kg(summary.wetMass)}) exceeds ${vehicle.name}'s ${mission.env.launchTarget} capacity (${kg(capacity)}).`,
        );
      }
      if (!twrOk) {
        reasons.push(
          `ERB-3 Liftoff TWR (${fmt(liftoffTwr, 2)}) is ≤ 1.0: rocket cannot lift off the pad.`,
        );
      } else if (liftoffTwr < 1.2) {
        reasons.push(
          `ERB-3 Liftoff TWR (${fmt(liftoffTwr, 2)}) is below the 1.20 nominal margin.`,
        );
      }
      if (!gLoadOk) {
        reasons.push(
          `ERB-9 Structural G-Load: ${vehicle.name} peaks at ${vehicle.maxG} g, exceeding the ${summary.resolved.bus?.name ?? 'bus'} limit (${busMaxG} g).`,
        );
      }
      if (!budgetOk) {
        reasons.push(
          `ERB-13 Over Budget: Total mission cost (${money(summary.totalCost)}) exceeds the ${money(mission.budget)} budget.`,
        );
      }
      if (reasons.length === 0) {
        reasons.push(
          `All launch checks pass: ${kg(capacity - summary.wetMass)} payload margin, TWR ${fmt(liftoffTwr, 2)}, ${vehicle.maxG} g ≤ ${busMaxG} g bus limit, within ${money(mission.budget)} budget.`,
        );
      }

      return {
        vehicle,
        summary,
        review,
        capacityOk,
        twrOk,
        gLoadOk,
        budgetOk,
        reasons,
      };
    });
  }, [mission, design]);

  const selectedItem = evaluated.find((item) => item.vehicle.id === vehicleId) ?? null;
  const baselineSummary = useMemo(
    () => (design && mission ? summarizeDesign(design, mission, null) : null),
    [design, mission],
  );
  const twrChallenge = useMemo(
    () =>
      mission && selectedItem
        ? generateChallenge('twr', {
            mission,
            vehicle: selectedItem.vehicle,
            summary: selectedItem.summary,
          })
        : null,
    [mission, selectedItem],
  );

  if (!mission || !design || !baselineSummary || evaluated.length === 0) return null;

  const displaySummary = selectedItem ? selectedItem.summary : baselineSummary;

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4 sm:p-6">
      {/* Header */}
      <header className="pointer-events-auto flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-panel px-5 py-3.5 backdrop-blur">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
            Step 3 · Launch Complex · Rocket Selection
          </p>
          <h1 className="mt-0.5 text-xl font-bold text-ink sm:text-2xl">
            Select Launch Vehicle for {mission.pathway.name} ({mission.trajectory.name})
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.14em]">
          <span className="rounded-full border border-line bg-black/30 px-3 py-1 text-ink">
            Target: {mission.env.launchTarget} (×{fmt(mission.env.launchCapacityFactor, 2)})
          </span>
          <span className="rounded-full border border-line bg-black/30 px-3 py-1 text-ink">
            Spacecraft Wet Mass: {kg(baselineSummary.wetMass)}
          </span>
          <span className="rounded-full border border-line bg-black/30 px-3 py-1 text-ink">
            Bus Max G: {baselineSummary.resolved.bus?.maxG ?? 0} g
          </span>
          {selectedItem && twrChallenge && (
            <button
              type="button"
              onClick={() => setShowTwrQuiz((v) => !v)}
              className="rounded-full border border-accent/60 bg-accent/15 px-3 py-1 text-accent transition hover:bg-accent/25"
            >
              {showTwrQuiz ? 'Close TWR Console' : 'Verify Liftoff TWR Formula'}
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="my-3 grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto lg:grid-cols-12">
        <div className="pointer-events-auto flex flex-col gap-3 lg:col-span-8">
          {showTwrQuiz && twrChallenge && (
            <PhysicsConsole
              challenge={twrChallenge}
              difficulty={difficulty}
              onDone={(res) => {
                recordChallengeResult(res);
                setShowTwrQuiz(false);
              }}
            />
          )}

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            {evaluated.map((item) => {
              const isSelected = item.vehicle.id === vehicleId;
              const isGo = item.review.go;
              const capacity = item.summary.launchCapacity ?? 0;
              const busMaxG = item.summary.resolved.bus?.maxG ?? 0;

              return (
                <div
                  key={item.vehicle.id}
                  data-testid={`rocket-card-${item.vehicle.id}`}
                  onClick={() => selectLaunchVehicle(item.vehicle.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      selectLaunchVehicle(item.vehicle.id);
                    }
                  }}
                  aria-pressed={isSelected}
                  className={`flex cursor-pointer flex-col justify-between rounded-2xl border p-4 text-left transition backdrop-blur ${
                    isSelected
                      ? 'border-accent bg-panel shadow-[0_0_26px_rgba(92,225,255,0.2)]'
                      : 'border-line bg-panel/80 hover:border-accent/60'
                  }`}
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-[0.14em] ${
                          isSelected ? 'bg-accent text-space' : 'border border-line text-muted'
                        }`}
                      >
                        {isSelected ? 'Selected Rocket' : `${vehicleHeightM(item.vehicle.id)} m Tall`}
                      </span>
                      <span
                        data-testid={`rocket-status-${item.vehicle.id}`}
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-[0.12em] ${
                          isGo
                            ? 'border-ok/50 bg-ok/15 text-ok'
                            : 'border-danger/50 bg-danger/15 text-danger'
                        }`}
                      >
                        {isGo ? '✓ GO Compatible' : '✗ NO-GO Incompatible'}
                      </span>
                    </div>

                    <div className="mt-2 flex items-baseline justify-between gap-2">
                      <h2 className="text-lg font-bold text-ink">{item.vehicle.name}</h2>
                      <span className="font-mono text-sm font-bold text-accent">{money(item.vehicle.cost)}</span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-muted">{item.vehicle.description}</p>

                    {/* 4 Rocket Engineering Specs */}
                    <dl className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-line/70 bg-black/25 p-2.5 text-xs">
                      <div>
                        <dt className="uppercase tracking-[0.1em] text-muted">
                          {mission.env.launchTarget} Capacity
                        </dt>
                        <dd className={`mt-0.5 font-mono font-bold ${item.capacityOk ? 'text-ok' : 'text-danger'}`}>
                          {item.capacityOk ? '✓ ' : '✗ '}
                          {kg(capacity)}
                        </dd>
                        <dd className="font-mono text-[11px] text-muted">
                          Craft: {kg(item.summary.wetMass)}
                        </dd>
                      </div>

                      <div>
                        <dt className="uppercase tracking-[0.1em] text-muted">Liftoff TWR</dt>
                        <dd
                          className={`mt-0.5 font-mono font-bold ${
                            (item.summary.liftoffTwr ?? 0) >= 1.2
                              ? 'text-ok'
                              : (item.summary.liftoffTwr ?? 0) > 1
                                ? 'text-warn'
                                : 'text-danger'
                          }`}
                        >
                          {item.twrOk ? '✓ ' : '✗ '}
                          {fmt(item.summary.liftoffTwr ?? 0, 2)}
                        </dd>
                        <dd className="font-mono text-[11px] text-muted">
                           Thrust: {fmt(item.vehicle.thrust / 1000)} kN
                        </dd>
                      </div>

                      <div>
                        <dt className="uppercase tracking-[0.1em] text-muted">Max Launch Load</dt>
                        <dd className={`mt-0.5 font-mono font-bold ${item.gLoadOk ? 'text-ok' : 'text-danger'}`}>
                          {item.gLoadOk ? '✓ ' : '✗ '}
                          {item.vehicle.maxG} g peak
                        </dd>
                        <dd className="font-mono text-[11px] text-muted">Bus limit: {busMaxG} g</dd>
                      </div>

                      <div>
                        <dt className="uppercase tracking-[0.1em] text-muted">Total Budget</dt>
                        <dd className={`mt-0.5 font-mono font-bold ${item.budgetOk ? 'text-ok' : 'text-danger'}`}>
                          {item.budgetOk ? '✓ ' : '✗ '}
                          {money(item.summary.totalCost)}
                        </dd>
                        <dd className="font-mono text-[11px] text-muted">Cap: {money(mission.budget)}</dd>
                      </div>
                    </dl>
                  </div>

                  {/* Compatibility reasoning */}
                  <div className="mt-3 border-t border-line/70 pt-2.5 text-xs">
                    {item.reasons.map((reason) => (
                      <p
                        key={reason}
                        className={`leading-snug ${isGo ? 'text-ok/95' : 'text-danger/95'}`}
                      >
                        {reason}
                      </p>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Live ResourcePanel with selected rocket */}
        <div className="pointer-events-auto lg:col-span-4">
          <ResourcePanel
            summary={displaySummary}
            mission={mission}
            before={selectedItem ? baselineSummary : undefined}
            title={selectedItem ? `With ${selectedItem.vehicle.name}` : 'Select a Launch Vehicle'}
          />
        </div>
      </div>

      {/* Footer Navigation */}
      <footer className="pointer-events-auto flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-panel px-5 py-3.5 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={() => goTo('TRAJECTORY')}>
            ← BACK TO TRAJECTORY
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {!selectedItem && (
            <p className="text-xs font-semibold text-warn" role="status">
              Click a launch vehicle card or 3D rocket on the pad to select it.
            </p>
          )}
          <Button
            disabled={!selectedItem}
            onClick={() => proceedToGoNoGo()}
          >
            PROCEED TO GO / NO-GO POLL →
          </Button>
        </div>
      </footer>
    </div>
  );
}
