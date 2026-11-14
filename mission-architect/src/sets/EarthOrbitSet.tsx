'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';

import { SUN_DIRECTION, TEXTURES } from '@/three/constants';
import { Planet } from '@/three/Planet';
import { ProbePlaceholder } from '@/three/ProbePlaceholder';
import { Starfield } from '@/three/Starfield';
import { SunLight } from '@/three/SunLight';
import { SceneBackground } from '@/three/SceneBackground';

export const EARTH_RADIUS = 2;
const EARTH_TEXTURES = {
  map: TEXTURES.earthDay,
  nightMap: TEXTURES.earthNight,
  specularMap: TEXTURES.earthSpecular,
  normalMap: TEXTURES.earthNormal,
  cloudsMap: TEXTURES.earthClouds,
};

/** A small spacecraft circling the Earth (not to scale). */
function OrbitingProbe({ speed }: { speed: number }) {
  const orbit = useRef<Group>(null);
  useFrame((_, delta) => {
    if (orbit.current) orbit.current.rotation.y += speed * delta;
  });
  return (
    <group rotation={[0.35, 0, 0.3]}>
      <group ref={orbit} rotation={[0, -2.0, 0]}>
        <ProbePlaceholder position={[EARTH_RADIUS * 1.42, 0, 0]} rotation={[0.4, 0.6, 1.2]} scale={0.055} />
      </group>
    </group>
  );
}

/** The Earth from orbit, with stars and a passing spacecraft. */
export function EarthOrbitSet({ reducedMotion = false, lowQuality = false }: { reducedMotion?: boolean; lowQuality?: boolean }) {
  return (
    <>
      <SceneBackground />
      <Starfield count={lowQuality ? 1200 : 2600} />
      <SunLight direction={SUN_DIRECTION} />
      <Planet
        textures={EARTH_TEXTURES}
        radius={EARTH_RADIUS}
        sunDirection={SUN_DIRECTION}
        rotationSpeed={reducedMotion ? 0.006 : 0.02}
        tilt={0.41}
        atmosphereColor="#5aa8ff"
        segments={lowQuality ? 64 : 128}
      />
      <OrbitingProbe speed={reducedMotion ? 0.03 : 0.11} />
    </>
  );
}
