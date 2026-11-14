'use client';

import { Environment, Lightformer } from '@react-three/drei';
import type { Vector3 } from 'three';

interface SunLightProps {
  direction: Vector3;
  intensity?: number;
}

/**
 * Sunlight for PBR models (spacecraft, rockets): one directional light plus a
 * small generated environment map, so metal surfaces have something to
 * reflect. Built from light shapes in code: no HDRI download needed.
 */
export function SunLight({ direction, intensity = 3.2 }: SunLightProps) {
  const sun = direction.clone().multiplyScalar(12);
  const earthshine = direction.clone().multiplyScalar(-8);

  return (
    <>
      <directionalLight position={sun} intensity={intensity} color="#fff6e8" />
      <ambientLight intensity={0.1} color="#b9cff5" />
      <Environment resolution={128} frames={1}>
        <Lightformer form="circle" intensity={9} color="#fff3df" position={sun} scale={6} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={1.4} color="#ffe9c9" position={sun.clone().multiplyScalar(0.9)} scale={22} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={0.35} color="#7fa6dc" position={earthshine} scale={14} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={0.25} color="#8fa6c9" position={[0, 9, 0]} scale={10} target={[0, 0, 0]} />
      </Environment>
    </>
  );
}
