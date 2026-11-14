'use client';

import { OrbitControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useLayoutEffect } from 'react';

import { useGame } from '@/hooks/useGame';
import { SUN_DIRECTION } from '@/three/constants';
import { ProbePlaceholder } from '@/three/ProbePlaceholder';
import { Starfield } from '@/three/Starfield';
import { SunLight } from '@/three/SunLight';

/**
 * Phase 01 stand-in for the scenes that come later. It proves two things:
 * scenes swap inside the same canvas, and a compressed GLB loads and can be
 * inspected with orbit / zoom controls.
 */
export function ModelPreviewScene() {
  const camera = useThree((state) => state.camera);
  const reducedMotion = useGame((state) => state.settings.reducedMotion);

  useLayoutEffect(() => {
    camera.position.set(-5.2, 2.8, 7.6);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  return (
    <>
      <Starfield count={1500} milkyWay={0.3} seed={11} />
      <SunLight direction={SUN_DIRECTION} />
      <ProbePlaceholder />
      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        minDistance={4}
        maxDistance={18}
        autoRotate={!reducedMotion}
        autoRotateSpeed={0.6}
      />
    </>
  );
}
