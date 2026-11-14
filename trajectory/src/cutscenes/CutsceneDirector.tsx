'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';

import { useGame } from '@/hooks/useGame';
import { gameStore } from '@/game/core/store';
import { EarthOrbitSet } from '@/sets/EarthOrbitSet';
import { HangarSet } from '@/sets/HangarSet';
import { LaunchPadSet } from '@/sets/LaunchPadSet';
import { MessageSet } from '@/sets/MessageSet';
import { CentrifugeSet, PoolSet, SimulatorSet } from '@/sets/TrainingSets';

import { cutsceneStore } from './cutsceneStore';
import { cameraAt, locate, shotStarts, totalDuration, type CutsceneScript, type SetId } from './timeline';

function ShotSet({ set }: { set: SetId }) {
  const reducedMotion = useGame((state) => state.settings.reducedMotion);
  const lowQuality = useGame((state) => state.settings.quality === 'low');
  switch (set) {
    case 'launchpad':
      return <LaunchPadSet />;
    case 'orbit':
      return <EarthOrbitSet reducedMotion={reducedMotion} lowQuality={lowQuality} />;
    case 'message':
      return <MessageSet />;
    case 'centrifuge':
      return <CentrifugeSet reducedMotion={reducedMotion} />;
    case 'simulator':
      return <SimulatorSet />;
    case 'pool':
      return <PoolSet />;
    case 'hangar':
      return <HangarSet />;
  }
}

interface CutsceneDirectorProps {
  script: CutsceneScript;
  onComplete: () => void;
}

/**
 * Plays a cutscene inside the shared canvas: moves the camera along each
 * shot, swaps the 3D set, and tells the overlay which line to show.
 */
export function CutsceneDirector({ script, onComplete }: CutsceneDirectorProps) {
  const reducedMotion = useGame((state) => state.settings.reducedMotion);
  const time = useRef(0);
  const finished = useRef(false);
  const handledNext = useRef(0);
  const current = useRef(0);
  const [index, setIndex] = useState(0);
  const complete = useRef(onComplete);
  useEffect(() => {
    complete.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    cutsceneStore.getState().start(script.id);
    time.current = 0;
    finished.current = false;
    handledNext.current = 0;
    current.current = 0;
    return () => cutsceneStore.getState().stop();
  }, [script.id]);

  useFrame((state, delta) => {
    if (finished.current) return;
    const ui = cutsceneStore.getState();
    const finish = () => {
      finished.current = true;
      gameStore.getState().markCutsceneSeen(script.id);
      complete.current();
    };
    if (ui.skipRequested) {
      finish();
      return;
    }
    if (ui.nextRequests !== handledNext.current) {
      handledNext.current = ui.nextRequests;
      const starts = shotStarts(script);
      const now = locate(script, time.current).index;
      time.current = now + 1 < starts.length ? starts[now + 1] : totalDuration(script);
    } else {
      time.current += Math.min(delta, 0.1);
    }
    const located = locate(script, time.current);
    if (located.done) {
      finish();
      return;
    }
    if (located.index !== current.current) {
      current.current = located.index;
      setIndex(located.index);
      ui.setIndex(located.index);
    }
    const { position, target } = cameraAt(located.shot, located.progress, reducedMotion);
    state.camera.position.set(position[0], position[1], position[2]);
    state.camera.lookAt(target[0], target[1], target[2]);
  });

  return <ShotSet set={script.shots[index].set} />;
}
