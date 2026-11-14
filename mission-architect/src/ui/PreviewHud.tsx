'use client';

import { useGame } from '@/hooks/useGame';

import { Button } from './Button';

/** Overlay for phases whose real scenes aren't built yet. */
export function PreviewHud() {
  const phase = useGame((state) => state.phase);
  const goTo = useGame((state) => state.goTo);
  const journey = phase === 'JOURNEY';

  return (
    <div className="absolute inset-x-0 bottom-0 flex justify-center p-6 sm:justify-start sm:p-10">
      <div className="hud-enter pointer-events-auto max-w-md rounded-2xl border border-line bg-panel p-6 backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-accent">
          {journey ? 'Step 6 · Mission Journey & Operations' : 'Coming soon'}
        </p>
        <h2 className="mt-2 text-2xl font-bold text-ink">
          {journey ? 'Orbit Insertion Complete — Deep-Space Journey' : 'Under construction'}
        </h2>
        <p className="mt-3 leading-relaxed text-muted">
          {journey
            ? 'Your spacecraft is in orbit and on internal power! Deep-space journey events and mission operations arrive in Phase 07.'
            : 'This part of the mission arrives in a later build.'}
        </p>
        <Button className="mt-5" variant="secondary" onClick={() => goTo(journey ? 'CHAPTER_SELECT' : 'TITLE')}>
          {journey ? 'BACK TO MISSION MAP' : 'BACK TO TITLE'}
        </Button>
      </div>
    </div>
  );
}
