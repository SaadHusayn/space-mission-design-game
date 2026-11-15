'use client';

import { useState } from 'react';

import {
  fmt,
  gameData,
  getChapterLeaderboard,
  kg,
  money,
  type PathwayId,
  type SavedRunEntry,
} from '@/game';
import { MissionPatch } from '@/ui/MissionPatch';

interface LeaderboardProps {
  initialPathwayId: PathwayId;
  onClose: () => void;
  onLoadRunDesign: (run: SavedRunEntry) => void;
}

export function Leaderboard({
  initialPathwayId,
  onClose,
  onLoadRunDesign,
}: LeaderboardProps) {
  const [selectedPathway, setSelectedPathway] = useState<PathwayId>(initialPathwayId);
  const entries = getChapterLeaderboard(selectedPathway);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Chapter Mission Leaderboard"
      className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
    >
      <div className="flex max-h-[88vh] w-full max-w-4xl flex-col rounded-2xl border border-line bg-panel p-5 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">
              Local Mission Rankings (N1)
            </p>
            <h3 className="text-lg font-bold text-ink">
              Chapter Leaderboard — Best Flight Scores
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

        {/* Pathway Filter Tabs */}
        <div
          role="tablist"
          aria-label="Select Chapter Pathway"
          className="mt-3 flex flex-wrap gap-1.5"
        >
          {gameData.pathways.map((p) => {
            const active = p.id === selectedPathway;
            return (
              <button
                key={p.id}
                role="tab"
                type="button"
                aria-selected={active}
                onClick={() => setSelectedPathway(p.id)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? 'border-accent bg-accent/20 text-accent'
                    : 'border-line bg-space/60 text-muted hover:border-accent/50 hover:text-ink'
                }`}
              >
                Ch.{p.chapter}: {p.name}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex-1 overflow-y-auto pr-1">
          {entries.length === 0 ? (
            <div className="rounded-xl border border-line bg-space/60 p-8 text-center text-sm text-muted">
              No completed runs recorded for this chapter yet. Complete a flight to post a score!
            </div>
          ) : (
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-wider text-muted">
                  <th className="py-2 pr-2">Rank</th>
                  <th className="py-2 px-2">Crew</th>
                  <th className="py-2 px-2">Score &amp; Grade</th>
                  <th className="py-2 px-2">Science</th>
                  <th className="py-2 px-2">Cost &amp; Mass</th>
                  <th className="py-2 px-2">Design Hash</th>
                  <th className="py-2 pl-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {entries.map((run, idx) => (
                  <tr key={run.id} className="hover:bg-space/50">
                    <td className="py-2.5 pr-2 font-mono font-bold text-accent">
                      #{idx + 1}
                    </td>
                    <td className="py-2.5 px-2">
                      <div className="flex items-center gap-2">
                        <MissionPatch patch={run.patch} size={28} label="Run patch" />
                        <div>
                          <p className="font-bold text-ink">{run.callSign}</p>
                          <p className="text-[10px] uppercase text-muted">
                            {run.difficulty} · {run.outcome}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-2 font-mono">
                      <span className="text-sm font-bold text-ink">{run.score}</span>
                      <span className="ml-1.5 rounded border border-accent/40 bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold text-accent">
                        {run.grade}
                      </span>
                      <span className="ml-1.5 text-amber-400">
                        {'★'.repeat(run.stars)}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 font-mono text-ink">
                      {fmt(run.science)} pts
                    </td>
                    <td className="py-2.5 px-2 font-mono text-[11px] text-muted">
                      {money(run.totalCost)} · {kg(run.wetMass)}
                    </td>
                    <td className="py-2.5 px-2 font-mono text-[11px] text-accent">
                      {run.designHash}
                    </td>
                    <td className="py-2.5 pl-2 text-right">
                      <button
                        type="button"
                        onClick={() => onLoadRunDesign(run)}
                        className="rounded-lg border border-accent/50 bg-accent/15 px-2.5 py-1 text-[11px] font-semibold text-accent transition hover:bg-accent hover:text-space"
                      >
                        Load Build →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
