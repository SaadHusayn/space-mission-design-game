'use client';

import { OrbitControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useLayoutEffect, useMemo } from 'react';
import { Vector3 } from 'three';

import { emptyDesign, SLOT_IDS, slotApplicable, type SlotId } from '@/game';
import { useGame } from '@/hooks/useGame';
import { useCurrentMission } from '@/scenes/Briefing/BriefingScenes';
import { CrewLineup, EngineerTeam } from '@/scenes/Training/TrainingScene';
import { HangarSet } from '@/sets/HangarSet';
import { Spacecraft } from '@/three/Spacecraft';

import { assemblyStore, useAssembly } from './assemblyStore';

const ASSEMBLY_TARGET = new Vector3(0, 2.35, 0);
const ASSEMBLY_CAMERA = new Vector3(6.2, 4.1, 8.2);
const REVIEW_CAMERA = new Vector3(-4.2, 3.2, 7.2);

/** 3D Mission Design Center for ASSEMBLY and ERB_REVIEW phases. */
export function HangarScene() {
  const camera = useThree((state) => state.camera);
  const phase = useGame((state) => state.phase);
  const design = useGame((state) => state.design);
  const reducedMotion = useGame((state) => state.settings.reducedMotion);
  const mission = useCurrentMission();

  const selectedTarget = useAssembly((state) => state.selectedTarget);
  const hoveredTarget = useAssembly((state) => state.hoveredTarget);
  const exploded = useAssembly((state) => state.exploded);

  const isReview = phase === 'ERB_REVIEW';

  useLayoutEffect(() => {
    camera.position.copy(isReview ? REVIEW_CAMERA : ASSEMBLY_CAMERA);
    camera.lookAt(ASSEMBLY_TARGET);
  }, [camera, isReview]);

  const applicableSlots = useMemo(() => {
    if (!mission) return new Set<SlotId>(SLOT_IDS);
    return new Set<SlotId>(SLOT_IDS.filter((slot) => slotApplicable(slot, mission)));
  }, [mission]);

  return (
    <>
      <HangarSet brightness={isReview ? 0.85 : 1} holoTable />
      <Spacecraft
        design={design ?? emptyDesign()}
        selectedTarget={selectedTarget}
        hoveredTarget={hoveredTarget}
        exploded={exploded}
        applicableSlots={applicableSlots}
        onSelectTarget={(target) => assemblyStore.getState().selectTarget(target)}
        onHoverTarget={(target) => assemblyStore.getState().hoverTarget(target)}
      />
      <CrewLineup />
      <EngineerTeam />
      <OrbitControls
        makeDefault
        target={ASSEMBLY_TARGET}
        enablePan={false}
        enableDamping
        minDistance={3.5}
        maxDistance={18}
        maxPolarAngle={Math.PI * 0.49}
        autoRotate={isReview && !reducedMotion}
        autoRotateSpeed={0.35}
      />
    </>
  );
}
