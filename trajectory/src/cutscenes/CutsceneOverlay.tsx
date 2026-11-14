'use client';

import { useEffect, useRef, useState } from 'react';

import { SPEAKERS } from '@/game/data/story';

import { cutsceneStore, useCutscene } from './cutsceneStore';
import { CUTSCENES } from './scripts';

const HOLD_TO_SKIP_MS = 700;

/** Letterbox bars, subtitles with the speaker, and next / skip controls. */
export function CutsceneOverlay() {
  const scriptId = useCutscene((state) => state.scriptId);
  const index = useCutscene((state) => state.index);
  const [holding, setHolding] = useState(false);
  const holdTimer = useRef<number | null>(null);

  const script = scriptId ? CUTSCENES[scriptId as keyof typeof CUTSCENES] : null;
  const shot = script?.shots[index];

  useEffect(() => {
    if (!script) return;
    const clearHold = () => {
      if (holdTimer.current !== null) window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
      setHolding(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.key === 'Enter' || event.key === 'ArrowRight') {
        event.preventDefault();
        cutsceneStore.getState().requestNext();
      }
      if (event.key === 'Escape' || event.key === ' ') {
        event.preventDefault();
        setHolding(true);
        holdTimer.current = window.setTimeout(() => {
          cutsceneStore.getState().requestSkip();
          clearHold();
        }, HOLD_TO_SKIP_MS);
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === ' ') clearHold();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      clearHold();
    };
  }, [script]);

  if (!script || !shot) return null;
  const speaker = shot.line ? SPEAKERS[shot.line.speaker] : null;

  return (
    <div className="absolute inset-0 flex flex-col justify-between">
      <div className="h-[9vh] bg-black/85" />
      <div className="flex flex-1 flex-col items-center justify-start px-6 pt-6">
        {shot.caption && (
          <p key={`c${index}`} className="hud-enter max-w-3xl text-center text-xl font-semibold tracking-[0.14em] text-ink [text-shadow:0_2px_12px_#000] sm:text-2xl">
            {shot.caption}
          </p>
        )}
      </div>
      <div className="flex min-h-[18vh] flex-col items-center justify-center gap-4 bg-black/85 px-6 py-4">
        {shot.line && speaker && (
          <div key={`l${index}`} className="hud-enter flex max-w-3xl items-start gap-4" aria-live="polite">
            <span
              className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold"
              style={{ borderColor: speaker.colour, color: speaker.colour }}
              aria-hidden
            >
              {speaker.initials}
            </span>
            <p className="text-lg leading-relaxed text-ink sm:text-xl">
              <span className="mr-2 font-bold" style={{ color: speaker.colour }}>
                {speaker.name}:
              </span>
              {shot.line.text}
            </p>
          </div>
        )}
        <div className="pointer-events-auto flex items-center gap-3 text-sm">
          <button
            type="button"
            onClick={() => cutsceneStore.getState().requestNext()}
            className="rounded-full border border-line px-4 py-1.5 font-semibold tracking-[0.12em] text-muted transition hover:border-accent hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
          >
            NEXT ▸
          </button>
          <button
            type="button"
            onClick={() => cutsceneStore.getState().requestSkip()}
            className="rounded-full border border-line px-4 py-1.5 font-semibold tracking-[0.12em] text-muted transition hover:border-accent hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
          >
            SKIP
          </button>
          <span className={`text-xs tracking-[0.1em] ${holding ? 'text-accent' : 'text-muted/70'}`}>
            {holding ? 'Keep holding to skip…' : 'or hold Esc / Space'}
          </span>
          <span className="text-xs text-muted/70">
            {index + 1} / {script.shots.length}
          </span>
        </div>
      </div>
    </div>
  );
}
