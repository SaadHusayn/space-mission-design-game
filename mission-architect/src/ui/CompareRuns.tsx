'use client';

import { useMemo, useState } from 'react';

import {
  compareRuns,
  createMission,
  createSavedRunSnapshot,
  getLaunchVehicle,
  loadSavedRuns,
  runJourney,
  scoreMission,
  WINNING_DESIGNS,
  type SavedRunEntry,
} from '@/game';

interface CompareRunsProps {
  currentRun: SavedRunEntry;
  onClose: () => void;
  onLoadDesign: (run: SavedRunEntry) => void;
}

function buildReferenceRun(currentRun: SavedRunEntry): SavedRunEntry {
  const candidates = WINNING_DESIGNS.filter((d) => d.pathway === currentRun.pathwayId);
  const fixture =
    candidates.find((d) => d.trajectory !== currentRun.trajectoryId) ??
    candidates[0] ??
    WINNING_DESIGNS[0];

  const mission = createMission(fixture.pathway, fixture.trajectory, currentRun.difficulty);
  const vehicle = getLaunchVehicle(fixture.vehicle);
  const state = runJourney({
    design: structuredClone(fixture.design),
    mission,
    vehicle,
    seed: 1,
  });
  const score = scoreMission(state, { physics: 1 });
  return createSavedRunSnapshot({
    id: `ref-${fixture.pathway}-${fixture.trajectory}`,
    state,
    score,
    callSign: `OEA Reference (${fixture.name.split(':')[0]})`,
    difficulty: currentRun.difficulty,
  });
}

export function CompareRuns({ currentRun, onClose, onLoadDesign }: CompareRunsProps) {
  const allRuns = useMemo(() => {
    const saved = loadSavedRuns().filter((r) => r.pathwayId === currentRun.pathwayId);
    const hasCurrent = saved.some((r) => r.id === currentRun.id);
    const list = hasCurrent ? saved : [currentRun, ...saved];
    const refRun = buildReferenceRun(currentRun);
    return [...list, refRun];
  }, [currentRun]);

  const [runAId, setRunAId] = useState<string>(currentRun.id);
  const [runBId, setRunBId] = useState<string>(() => {
    const other = allRuns.find((r) => r.id !== currentRun.id);
    return other?.id ?? currentRun.id;
  });

  const runA = allRuns.find((r) => r.id === runAId) ?? currentRun;
  const runB = allRuns.find((r) => r.id === runBId) ?? allRuns[allRuns.length - 1] ?? currentRun;

  const comparison = useMemo(() => compareRuns(runA, runB), [runA, runB]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Compare Mission Runs"
      className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
    >
      <div className="flex max-h-[88vh] w-full max-w-5xl flex-col rounded-2xl border border-line bg-panel p-5 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">
              Side-by-Side Architecture Comparison (N2 · R5)
            </p>
            <h3 className="text-lg font-bold text-ink">
              Compare Mission Runs &amp; Spacecraft Trade-Offs
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-line bg-space/80 px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-accent"
          >
            ✕ Close
          </button>
        </div>

        {/* Run Selectors */}
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-line bg-space/70 p-3">
            <label htmlFor="compare-run-a" className="block text-[11px] font-bold uppercase tracking-wider text-accent">
              Run A (Baseline)
            </label>
            <select
              id="compare-run-a"
              value={runA.id}
              onChange={(e) => setRunAId(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-line bg-panel px-3 py-1.5 text-xs font-semibold text-ink"
            >
              {allRuns.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.callSign} — Score {r.score} ({r.grade}) · {r.designHash}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-xl border border-line bg-space/70 p-3">
            <label htmlFor="compare-run-b" className="block text-[11px] font-bold uppercase tracking-wider text-ok">
              Run B (Comparison)
            </label>
            <select
              id="compare-run-b"
              value={runB.id}
              onChange={(e) => setRunBId(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-line bg-panel px-3 py-1.5 text-xs font-semibold text-ink"
            >
              {allRuns.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.callSign} — Score {r.score} ({r.grade}) · {r.designHash}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex-1 space-y-4 overflow-y-auto pr-1">
          {/* Key Engineering Metrics Table */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
              Performance &amp; Resource Metrics
            </h4>
            <table className="mt-2 w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-line text-[11px] uppercase text-muted">
                  <th className="py-1.5 pr-2">Metric</th>
                  <th className="py-1.5 px-2">Run A ({runA.callSign})</th>
                  <th className="py-1.5 px-2">Run B ({runB.callSign})</th>
                  <th className="py-1.5 pl-2">Difference (B vs A)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60 font-mono">
                {comparison.metrics.map((m) => (
                  <tr key={m.id}>
                    <td className="py-2 pr-2 font-sans font-semibold text-ink">{m.label}</td>
                    <td className={`py-2 px-2 ${m.better === 'A' ? 'font-bold text-ok' : 'text-ink'}`}>
                      {m.valueA}
                    </td>
                    <td className={`py-2 px-2 ${m.better === 'B' ? 'font-bold text-ok' : 'text-ink'}`}>
                      {m.valueB}
                    </td>
                    <td className="py-2 pl-2 text-accent">{m.deltaText}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Score Component Breakdown */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
              Score Component Breakdown
            </h4>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {comparison.components.map((c) => (
                <div key={c.id} className="rounded-xl border border-line bg-space/60 p-2.5 text-xs">
                  <p className="font-semibold text-ink">{c.label}</p>
                  <div className="mt-1 flex items-center justify-between font-mono text-[11px]">
                    <span className="text-muted">A: {c.scoreA !== null ? `${c.scoreA}%` : 'N/A'}</span>
                    <span className="text-ink">B: {c.scoreB !== null ? `${c.scoreB}%` : 'N/A'}</span>
                    {c.deltaPct !== null && (
                      <span className={c.deltaPct > 0 ? 'text-ok' : c.deltaPct < 0 ? 'text-danger' : 'text-muted'}>
                        {c.deltaPct > 0 ? `+${c.deltaPct}%` : `${c.deltaPct}%`}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Subsystem & Design Differences */}
          <div>
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
                Spacecraft Hardware &amp; Trajectory Differences ({comparison.changedCount} changed)
              </h4>
              <button
                type="button"
                onClick={() => onLoadDesign(runB)}
                className="rounded-lg border border-accent/50 bg-accent/15 px-3 py-1 text-xs font-semibold text-accent transition hover:bg-accent hover:text-space"
              >
                Load Run B Build into Assembly →
              </button>
            </div>
            <table className="mt-2 w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-line text-[11px] uppercase text-muted">
                  <th className="py-1.5 pr-2">Subsystem / Option</th>
                  <th className="py-1.5 px-2">Run A</th>
                  <th className="py-1.5 px-2">Run B</th>
                  <th className="py-1.5 pl-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {comparison.designDiffs.map((diff) => (
                  <tr key={diff.id} className={diff.changed ? 'bg-accent/10' : ''}>
                    <td className="py-2 pr-2 font-semibold text-ink">{diff.label}</td>
                    <td className="py-2 px-2 text-muted">{diff.valueA}</td>
                    <td className="py-2 px-2 font-medium text-ink">{diff.valueB}</td>
                    <td className="py-2 pl-2">
                      {diff.changed ? (
                        <span className="rounded-full border border-accent/50 bg-accent/20 px-2 py-0.5 text-[10px] font-bold text-accent">
                          Modified
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted">Identical</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
