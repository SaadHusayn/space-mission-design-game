'use client';

import { Stats } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useState } from 'react';

import { useGame } from '@/hooks/useGame';
import { CutsceneOverlay } from '@/cutscenes/CutsceneOverlay';
import { BriefingCutscene, ObjectiveScene } from '@/scenes/Briefing/BriefingScenes';
import { ObjectivePanel } from '@/scenes/Briefing/ObjectivePanel';
import { HangarScene } from '@/scenes/Hangar/HangarScene';
import { JourneyScene } from '@/scenes/Journey/JourneyScene';
import { LaunchScene, RolloutCutscene } from '@/scenes/Launch/LaunchScene';
import { RocketLineupScene } from '@/scenes/LaunchPad/RocketLineupScene';
import { TrajectoryScene } from '@/scenes/LaunchPad/TrajectoryScene';
import { PathwayHud } from '@/scenes/PathwayMap/PathwayHud';
import { PathwayMapScene } from '@/scenes/PathwayMap/PathwayMapScene';
import { ModelPreviewScene } from '@/scenes/ModelPreview/ModelPreviewScene';
import { PrologueHud } from '@/scenes/Prologue/PrologueHud';
import { PrologueScene } from '@/scenes/Prologue/PrologueScene';
import { ReportScene } from '@/scenes/Report/ReportScene';
import { TitleScene } from '@/scenes/Title/TitleScene';
import { AssemblyHud } from '@/ui/AssemblyHud';
import { GoNoGoPanel } from '@/ui/GoNoGoPanel';
import { JourneyHud } from '@/ui/JourneyHud';
import { LaunchHud } from '@/ui/LaunchHud';
import { Loader } from '@/ui/Loader';
import { PreviewHud } from '@/ui/PreviewHud';
import { ReportHud } from '@/ui/Report/ReportHud';
import { ReviewBoard } from '@/ui/ReviewBoard';
import { RocketSelectHud } from '@/ui/RocketSelectHud';
import { SettingsDialog } from '@/ui/SettingsDialog';
import { TitleMenu } from '@/ui/TitleMenu';
import { TrajectoryHud } from '@/ui/TrajectoryHud';
import { WebGLFallback } from '@/ui/WebGLFallback';

import { CanvasErrorBoundary } from './CanvasErrorBoundary';

/** With ?debug, exposes the scene and camera to the browser console and tests (window.__game3d). */
function DebugBridge() {
  const state = useThree();
  useEffect(() => {
    (window as unknown as { __game3d?: unknown }).__game3d = { scene: state.scene, camera: state.camera, gl: state.gl, raycaster: state.raycaster };
  }, [state.scene, state.camera, state.gl, state.raycaster]);
  return null;
}

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
  if (phase === 'BOOT' || phase === 'TITLE') return <TitleScene />;
  if (phase === 'PROLOGUE') return <PrologueScene />;
  if (phase === 'CHAPTER_SELECT') return <PathwayMapScene />;
  if (phase === 'BRIEFING') return <BriefingCutscene />;
  if (phase === 'OBJECTIVE') return <ObjectiveScene />;
  if (phase === 'ASSEMBLY' || phase === 'ERB_REVIEW') return <HangarScene />;
  if (phase === 'TRAJECTORY') return <TrajectoryScene />;
  if (phase === 'LAUNCH_VEHICLE' || phase === 'GO_NO_GO') return <RocketLineupScene />;
  if (phase === 'ROLLOUT') return <RolloutCutscene />;
  if (phase === 'LAUNCH') return <LaunchScene />;
  if (phase === 'JOURNEY' || phase === 'OPERATIONS') return <JourneyScene />;
  if (phase === 'REPORT') return <ReportScene />;
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
      {phase === 'CHAPTER_SELECT' && <PathwayHud />}
      {(phase === 'BRIEFING' || phase === 'ROLLOUT') && <CutsceneOverlay />}
      {phase === 'OBJECTIVE' && <ObjectivePanel />}
      {phase === 'ASSEMBLY' && <AssemblyHud />}
      {phase === 'ERB_REVIEW' && <ReviewBoard />}
      {phase === 'TRAJECTORY' && <TrajectoryHud />}
      {phase === 'LAUNCH_VEHICLE' && <RocketSelectHud />}
      {phase === 'GO_NO_GO' && <GoNoGoPanel />}
      {phase === 'LAUNCH' && <LaunchHud />}
      {(phase === 'JOURNEY' || phase === 'OPERATIONS') && <JourneyHud />}
      {phase === 'REPORT' && <ReportHud />}
      {![
        'BOOT',
        'TITLE',
        'PROLOGUE',
        'CHAPTER_SELECT',
        'BRIEFING',
        'OBJECTIVE',
        'ASSEMBLY',
        'ERB_REVIEW',
        'TRAJECTORY',
        'LAUNCH_VEHICLE',
        'GO_NO_GO',
        'ROLLOUT',
        'LAUNCH',
        'JOURNEY',
        'OPERATIONS',
        'REPORT',
      ].includes(phase) && <PreviewHud />}
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
          shadows={quality === 'high' ? 'percentage' : false}
          dpr={quality === 'high' ? [1, 2] : 1}
          camera={{ fov: 40, near: 0.1, far: 2500, position: [0, 0.45, 7.4] }}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
        >
          <Suspense fallback={null}>
            <SceneSwitch />
            <SceneReady />
          </Suspense>
          {debug && <Stats />}
          {debug && <DebugBridge />}
        </Canvas>
      </CanvasErrorBoundary>
      <Loader />
      <HudLayer />
    </div>
  );
}
