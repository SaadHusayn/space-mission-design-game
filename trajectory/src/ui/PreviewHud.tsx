'use client';

import { useGame } from '@/hooks/useGame';

import { Button } from './Button';

/** Overlay for the Phase 01 stand-in scene. */
export function PreviewHud() {
  const goTo = useGame((state) => state.goTo);

  return (
    <div className="absolute inset-x-0 bottom-0 flex justify-center p-6 sm:justify-start sm:p-10">
      <div className="hud-enter pointer-events-auto max-w-md rounded-2xl border border-line bg-panel p-6 backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-accent">Systems check</p>
        <h2 className="mt-2 text-2xl font-bold text-ink">Test spacecraft loaded</h2>
        <p className="mt-3 leading-relaxed text-muted">
          Drag to rotate. Scroll or pinch to zoom. This placeholder model proves the 3D pipeline works. Astronaut
          recruitment and training arrive in the next build.
        </p>
        <Button className="mt-5" variant="secondary" onClick={() => goTo('TITLE')}>
          BACK TO TITLE
        </Button>
      </div>
    </div>
  );
}
