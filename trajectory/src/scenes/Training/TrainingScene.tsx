'use client';

import { OrbitControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useLayoutEffect, useRef } from 'react';
import { Spherical, Vector3 } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

import { AVATAR_COLOURS, ROLES } from '@/game/core/crew';
import { useGame } from '@/hooks/useGame';
import { Astronaut, Engineer } from '@/sets/Figures';
import { HangarSet } from '@/sets/HangarSet';

import { SelectableProbe } from './SelectableProbe';
import { trainingStore, useTraining } from './trainingStore';

const TARGET = new Vector3(0, 2.2, 0);
const START = new Vector3(8.5, 5, 10.5);

/** The crew standing in a row in front of the spacecraft. */
export function CrewLineup() {
  const crew = useGame((state) => state.profile.crew);
  return (
    <group position={[4.5, 0, 4.5]} rotation={[0, -0.9, 0]}>
      {crew.map((member, index) => (
        <Astronaut
          key={member.id}
          position={[(index - (crew.length - 1) / 2) * 0.9, 0, 0]}
          colour={AVATAR_COLOURS[member.avatar]}
          accent={ROLES[member.roles[0]].colour}
        />
      ))}
    </group>
  );
}

/** The engineers by the holo-table. */
export function EngineerTeam() {
  return (
    <group>
      <Engineer position={[-7.4, 0, 4.4]} rotation={[0, 0.9, 0]} colour="#e9edf3" accent="#ffb547" />
      <Engineer position={[-5.6, 0, 5.2]} rotation={[0, 0.3, 0]} colour="#e9edf3" accent="#5ce1ff" />
      <Engineer position={[-4.4, 0, 3.6]} rotation={[0, -0.5, 0]} colour="#e9edf3" accent="#b48cff" />
    </group>
  );
}

/** Training: an interactive hangar where the crew learns the controls. */
export function TrainingScene({ interactive = true }: { interactive?: boolean }) {
  const camera = useThree((state) => state.camera);
  const controls = useRef<OrbitControlsImpl>(null);
  const start = useRef<{ azimuth: number; distance: number } | null>(null);
  const selected = useTraining((state) => state.selected);
  const swapped = useTraining((state) => state.swapped);
  const reducedMotion = useGame((state) => state.settings.reducedMotion);

  useLayoutEffect(() => {
    camera.position.copy(START);
    camera.lookAt(TARGET);
    const offset = new Spherical().setFromVector3(START.clone().sub(TARGET));
    start.current = { azimuth: offset.theta, distance: offset.radius };
  }, [camera]);

  const onChange = () => {
    const base = start.current;
    const orbit = controls.current;
    if (!base || !orbit) return;
    const offset = new Spherical().setFromVector3(orbit.object.position.clone().sub(orbit.target));
    const state = trainingStore.getState();
    if (!state.orbited && Math.abs(offset.theta - base.azimuth) > 0.35) state.markOrbited();
    if (state.orbited && !state.zoomed && base.distance - offset.radius > 3) state.markZoomed();
  };

  return (
    <>
      <HangarSet />
      <SelectableProbe
        position={[0, 2.2, 0]}
        selected={selected}
        bigArray={swapped}
        onSelect={(name) => trainingStore.getState().select(name)}
      />
      <CrewLineup />
      <EngineerTeam />
      <OrbitControls
        ref={controls}
        makeDefault
        enabled={interactive}
        target={TARGET}
        enablePan={false}
        enableDamping
        minDistance={4}
        maxDistance={22}
        maxPolarAngle={Math.PI * 0.49}
        autoRotate={!interactive && !reducedMotion}
        autoRotateSpeed={0.4}
        onChange={onChange}
      />
    </>
  );
}
