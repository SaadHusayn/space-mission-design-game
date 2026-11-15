'use client';

import { Button } from '@/ui/Button';

interface ReportActionsProps {
  onRedesignAndRefly: () => void;
  onTryAnotherTrajectory: () => void;
  onNextChapter: () => void;
  onOpenSaveExport: () => void;
  onOpenCompare: () => void;
  onOpenLeaderboard: () => void;
  unlockedNextChapterLabel: string | null;
}

export function ReportActions({
  onRedesignAndRefly,
  onTryAnotherTrajectory,
  onNextChapter,
  onOpenSaveExport,
  onOpenCompare,
  onOpenLeaderboard,
  unlockedNextChapterLabel,
}: ReportActionsProps) {
  return (
    <footer
      aria-label="Mission Report Actions"
      className="flex flex-col justify-between gap-3 rounded-2xl border border-line bg-panel/95 p-4 backdrop-blur lg:flex-row lg:items-center lg:px-6"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={onRedesignAndRefly}>
          🔧 REDESIGN &amp; RE-FLY
        </Button>
        <Button variant="secondary" onClick={onTryAnotherTrajectory}>
          🪐 TRY ANOTHER TRAJECTORY
        </Button>
        <Button variant="secondary" onClick={onNextChapter}>
          {unlockedNextChapterLabel
            ? `NEXT CHAPTER (${unlockedNextChapterLabel}) →`
            : 'BACK TO MISSION MAP'}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onOpenSaveExport}
          className="rounded-xl border border-line bg-space/80 px-3.5 py-2 text-xs font-semibold text-ink transition hover:border-accent hover:text-accent"
        >
          💾 Save / Share Design
        </button>
        <button
          type="button"
          onClick={onOpenCompare}
          className="rounded-xl border border-line bg-space/80 px-3.5 py-2 text-xs font-semibold text-ink transition hover:border-accent hover:text-accent"
        >
          ⚖ Compare Runs
        </button>
        <button
          type="button"
          onClick={onOpenLeaderboard}
          className="rounded-xl border border-line bg-space/80 px-3.5 py-2 text-xs font-semibold text-ink transition hover:border-accent hover:text-accent"
        >
          🏆 Chapter Leaderboard
        </button>
      </div>
    </footer>
  );
}
