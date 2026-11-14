'use client';

import { useGame } from '@/hooks/useGame';
import { EarthOrbitSet } from '@/sets/EarthOrbitSet';
import { CameraRig } from '@/three/CameraRig';

/** Title screen (and chapter select stand-in): the Earth from orbit. */
export function TitleScene() {
  const reducedMotion = useGame((state) => state.settings.reducedMotion);
  const lowQuality = useGame((state) => state.settings.quality === 'low');

  return (
    <>
      <CameraRig
        position={[0, 0.45, 7.4]}
        target={[-1.75, 0.1, 0]}
        portrait={{ position: [0, 0.4, 11], target: [0, 2.3, 0] }}
        drift={reducedMotion ? 0 : 1}
      />
      <EarthOrbitSet reducedMotion={reducedMotion} lowQuality={lowQuality} />
    </>
  );
}
