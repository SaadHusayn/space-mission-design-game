'use client';

import Link from 'next/link';
import { useEffect, useId } from 'react';

import { canTransition } from '@/game/core/machine';
import { useGame } from '@/hooks/useGame';

import { Button } from './Button';

/** Pause menu dialog: resume, settings, notebook, audio mute, and safe navigation. */
export function PauseMenu() {
  const open = useGame((state) => state.pauseOpen);
  const phase = useGame((state) => state.phase);
  const muted = useGame((state) => state.settings.muted);
  const setPauseOpen = useGame((state) => state.setPauseOpen);
  const setSettingsOpen = useGame((state) => state.setSettingsOpen);
  const setNotebookOpen = useGame((state) => state.setNotebookOpen);
  const setSetting = useGame((state) => state.setSetting);
  const goTo = useGame((state) => state.goTo);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPauseOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, setPauseOpen]);

  if (!open) return null;

  const canChapterSelect = canTransition(phase, 'CHAPTER_SELECT');
  const canTitle = canTransition(phase, 'TITLE');

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-space/75 p-6 backdrop-blur-sm"
      onClick={() => setPauseOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="hud-enter w-full max-w-sm rounded-2xl border border-line bg-panel p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Mission Control</p>
        <h2 id={titleId} className="mt-1 text-2xl font-bold text-ink">
          Paused
        </h2>
        <p className="mt-1 text-sm text-muted">Current phase: {phase.replaceAll('_', ' ')}</p>

        <div className="mt-6 flex flex-col gap-3">
          <Button onClick={() => setPauseOpen(false)}>Resume</Button>
          <Button
            variant="secondary"
            onClick={() => {
              setPauseOpen(false);
              setNotebookOpen(true);
            }}
          >
            Mission Notebook
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setPauseOpen(false);
              setSettingsOpen(true);
            }}
          >
            Settings
          </Button>
          <Button
            variant="secondary"
            onClick={() => setSetting('muted', !muted)}
            aria-pressed={muted}
          >
            {muted ? 'Unmute Audio' : 'Mute Audio'}
          </Button>
          {canChapterSelect && (
            <Button
              variant="secondary"
              onClick={() => {
                setPauseOpen(false);
                goTo('CHAPTER_SELECT');
              }}
            >
              Chapter Select
            </Button>
          )}
          {canTitle && (
            <Button
              variant="secondary"
              onClick={() => {
                setPauseOpen(false);
                goTo('TITLE');
              }}
            >
              Title Screen
            </Button>
          )}
          <Link
            href="/credits"
            className="mt-1 text-center text-sm text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-accent"
          >
            Credits &amp; Learn More
          </Link>
        </div>
      </div>
    </div>
  );
}
