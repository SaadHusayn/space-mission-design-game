'use client';

import { Stats } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Suspense, useEffect, useState } from 'react';

import { useGame } from '@/hooks/useGame';
import { ChapterSelectPlaceholder } from '@/scenes/ChapterSelect/ChapterSelectPlaceholder';
import { ModelPreviewScene } from '@/scenes/ModelPreview/ModelPreviewScene';
import { PrologueHud } from '@/scenes/Prologue/PrologueHud';
import { PrologueScene } from '@/scenes/Prologue/PrologueScene';
import { TitleScene } from '@/scenes/Title/TitleScene';
import { Loader } from '@/ui/Loader';
import { PreviewHud } from '@/ui/PreviewHud';
import { SettingsDialog } from '@/ui/SettingsDialog';
import { TitleMenu } from '@/ui/TitleMenu';
import { WebGLFallback } from '@/ui/WebGLFallback';

import { CanvasErrorBoundary } from './CanvasErrorBoundary';

function supportsWebGL2(): boolean {
  try {
    return document.createElement('canvas').getContext('webgl2') !== null;
  } catch {
    return false;
  }
}

/** Picks the 3D scene for the current phase. All scenes share one canvas. */
function SceneSwitch() {
  const phase = useGame((state) => state.phase);
  if (phase === 'BOOT' || phase === 'TITLE' || phase === 'CHAPTER_SELECT') return <TitleScene />;
  if (phase === 'PROLOGUE') return <PrologueScene />;
  // Later phases get their own scenes as they are built.
  return <ModelPreviewScene />;
}

/** Sits inside Suspense, so it only mounts once the first scene's assets have loaded. */
function SceneReady() {
  const goTo = useGame((state) => state.goTo);
  useEffect(() => {
    goTo('TITLE');
  }, [goTo]);
  return null;
}

/** The 2D interface drawn over the canvas. */
function HudLayer() {
  const phase = useGame((state) => state.phase);
  const reducedMotion = useGame((state) => state.settings.reducedMotion);
  return (
    <div className="pointer-events-none absolute inset-0 z-10" data-reduced-motion={reducedMotion}>
      {phase === 'TITLE' && <TitleMenu />}
      {phase === 'PROLOGUE' && <PrologueHud />}
      {phase === 'CHAPTER_SELECT' && <ChapterSelectPlaceholder />}
      {phase !== 'BOOT' && phase !== 'TITLE' && phase !== 'PROLOGUE' && phase !== 'CHAPTER_SELECT' && <PreviewHud />}
      <SettingsDialog />
    </div>
  );
}

export default function GameRoot() {
  const quality = useGame((state) => state.settings.quality);
  const [webgl] = useState(supportsWebGL2);
  const [debug] = useState(() => new URLSearchParams(window.location.search).has('debug'));

  if (!webgl) return <WebGLFallback />;

  return (
    <div className="fixed inset-0 overflow-hidden bg-space text-ink">
      <CanvasErrorBoundary>
        <Canvas
          shadows={quality === 'high'}
          dpr={quality === 'high' ? [1, 2] : 1}
          camera={{ fov: 40, near: 0.1, far: 2500, position: [0, 0.45, 7.4] }}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
        >
          <color attach="background" args={['#02040a']} />
          <Suspense fallback={null}>
            <SceneSwitch />
            <SceneReady />
          </Suspense>
          {debug && <Stats />}
        </Canvas>
      </CanvasErrorBoundary>
      <Loader />
      <HudLayer />
    </div>
  );
}
