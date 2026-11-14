'use client';

import { useGame } from '@/hooks/useGame';

import { Button } from './Button';

/** Overlay for phases whose real scenes aren't built yet. */
export function PreviewHud() {
  const phase = useGame((state) => state.phase);
  const goTo = useGame((state) => state.goTo);
  const trajectory = phase === 'TRAJECTORY';

  return (
    <div className="absolute inset-x-0 bottom-0 flex justify-center p-6 sm:justify-start sm:p-10">
      <div className="hud-enter pointer-events-auto max-w-md rounded-2xl border border-line bg-panel p-6 backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-accent">
          {trajectory ? 'Step 3 · Choose Trajectory & Rocket' : 'Coming soon'}
        </p>
        <h2 className="mt-2 text-2xl font-bold text-ink">
          {trajectory ? 'Trajectory & Launch Vehicle' : 'Under construction'}
        </h2>
        <p className="mt-3 leading-relaxed text-muted">
          {trajectory
            ? 'Your spacecraft passed the Engineering Review Board! Trajectory and launch vehicle selection arrive in Phase 06.'
            : 'This part of the mission arrives in a later build.'}
        </p>
        <Button className="mt-5" variant="secondary" onClick={() => goTo(trajectory ? 'ASSEMBLY' : 'TITLE')}>
          {trajectory ? 'BACK TO ASSEMBLY' : 'BACK TO TITLE'}
        </Button>
      </div>
    </div>
  );
}
