'use client';

import { useGame } from '@/hooks/useGame';

/** Persistent compact utility controls: Mute toggle, Mission Notebook, Settings, and Pause. */
export function UtilityBar() {
  const phase = useGame((state) => state.phase);
  const muted = useGame((state) => state.settings.muted);
  const setSetting = useGame((state) => state.setSetting);
  const setNotebookOpen = useGame((state) => state.setNotebookOpen);
  const setSettingsOpen = useGame((state) => state.setSettingsOpen);
  const setPauseOpen = useGame((state) => state.setPauseOpen);

  if (phase === 'BOOT' || phase === 'BRIEFING' || phase === 'ROLLOUT') return null;

  return (
    <nav
      aria-label="Game utility controls"
      className="pointer-events-auto fixed right-3 top-3 z-20 flex items-center gap-1.5 rounded-full border border-line bg-panel/90 px-2 py-1 backdrop-blur-sm"
    >
      <button
        type="button"
        onClick={() => setSetting('muted', !muted)}
        aria-pressed={muted}
        aria-label={muted ? 'Unmute audio' : 'Mute audio'}
        title={muted ? 'Unmute audio' : 'Mute audio'}
        className="rounded-full px-2.5 py-1 text-xs font-semibold text-ink transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-accent"
      >
        {muted ? '🔇 Muted' : '🔊 Sound'}
      </button>
      <button
        type="button"
        onClick={() => setNotebookOpen(true)}
        aria-label="Open Mission Notebook"
        title="Open Mission Notebook"
        className="rounded-full px-2.5 py-1 text-xs font-semibold text-ink transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-accent"
      >
        📓 Notebook
      </button>
      {phase !== 'TITLE' && (
        <>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label="Open Settings"
            title="Open Settings"
            className="rounded-full px-2.5 py-1 text-xs font-semibold text-ink transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-accent"
          >
            ⚙ Settings
          </button>
          <button
            type="button"
            onClick={() => setPauseOpen(true)}
            aria-label="Open Pause Menu"
            title="Open Pause Menu"
            className="rounded-full border border-line/80 bg-white/5 px-2.5 py-1 text-xs font-semibold text-ink transition hover:border-accent hover:bg-accent/15 focus-visible:outline-2 focus-visible:outline-accent"
          >
            ⏸ Pause
          </button>
        </>
      )}
    </nav>
  );
}
