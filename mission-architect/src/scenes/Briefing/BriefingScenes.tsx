'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';

import { briefingScript } from '@/cutscenes/briefing';
import { CutsceneDirector } from '@/cutscenes/CutsceneDirector';
import { createMission } from '@/game/sim/mission';
import { useGame } from '@/hooks/useGame';
import { BriefingSet } from '@/sets/BriefingSet';

/** The current mission's context (pathway + default trajectory + difficulty). */
export function useCurrentMission() {
  const mission = useGame((state) => state.mission);
  const difficulty = useGame((state) => state.profile.difficulty);
  return useMemo(() => (mission ? createMission(mission.pathwayId, mission.trajectoryId ?? undefined, difficulty) : null), [mission, difficulty]);
}

/** BRIEFING phase: Director Hale's briefing cutscene. */
export function BriefingCutscene() {
  const mission = useCurrentMission();
  const openObjective = useGame((state) => state.openObjective);
  const script = useMemo(() => (mission ? briefingScript(mission) : null), [mission]);
  if (!script) return null;
  return <CutsceneDirector script={script} onComplete={openObjective} />;
}

/** OBJECTIVE phase: the holo-table with a slow camera orbit behind the objective screen. */
export function ObjectiveScene() {
  const reducedMotion = useGame((state) => state.settings.reducedMotion);
  const angle = useRef(0.6);
  useFrame((state, delta) => {
    if (!reducedMotion) angle.current += delta * 0.06;
    state.camera.position.set(Math.cos(angle.current) * 6.5 + 1.5, 3.4, Math.sin(angle.current) * 6.5);
    state.camera.lookAt(1.6, 2.4, 0);
  });
  return <BriefingSet />;
}
