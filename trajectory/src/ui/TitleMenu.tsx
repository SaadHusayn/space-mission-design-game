'use client';

import { useGame } from '@/hooks/useGame';

import { Button } from './Button';

/** Title screen overlay: game name and main menu. */
export function TitleMenu() {
  const goTo = useGame((state) => state.goTo);
  const startPrologue = useGame((state) => state.startPrologue);
  const setSettingsOpen = useGame((state) => state.setSettingsOpen);
  const graduated = useGame((state) => state.profile.prologueDone);

  return (
    <div className="absolute inset-0 flex flex-col justify-start p-6 sm:justify-center sm:p-14 lg:p-20">
      <div className="hud-enter pointer-events-auto max-w-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-accent">Orbital Exploration Agency</p>
        <h1 className="mt-3 text-5xl font-extrabold tracking-[0.14em] text-ink [text-shadow:0_0_40px_rgb(92_225_255/0.35)] sm:text-7xl">
          TRAJECTORY
        </h1>
        <p className="mt-2 text-lg font-medium tracking-[0.34em] text-muted sm:text-2xl">PATHWAYS BEYOND</p>
        <p className="mt-6 max-w-md text-lg leading-relaxed text-ink/90">Design it. Launch it. Prove it with physics.</p>
        <div className="mt-9 flex flex-wrap gap-4">
          {graduated && <Button onClick={() => goTo('CHAPTER_SELECT')}>CONTINUE</Button>}
          <Button variant={graduated ? 'secondary' : 'primary'} onClick={() => startPrologue('intro')}>
            NEW MISSION
          </Button>
          {graduated && (
            <Button variant="secondary" onClick={() => startPrologue('training')}>
              TRAINING
            </Button>
          )}
          <Button variant="secondary" onClick={() => setSettingsOpen(true)}>
            SETTINGS
          </Button>
        </div>
      </div>
      <p className="pointer-events-none absolute bottom-5 left-6 right-6 text-xs tracking-[0.12em] text-muted [text-shadow:0_1px_6px_#02040a,0_0_2px_#02040a] sm:left-14 lg:left-20">
        Simplified physics for learning · Not to scale · Fictional agency and characters
      </p>
    </div>
  );
}
