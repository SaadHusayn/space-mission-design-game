'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { AdditiveBlending, BufferAttribute, BufferGeometry, type Points } from 'three';

export interface StormParticlesProps {
  active: boolean;
  reducedMotion?: boolean;
  count?: number;
}

/** Energetic solar particle storm sweeping past the spacecraft during a solar flare event. */
export function StormParticles({
  active,
  reducedMotion = false,
  count = 160,
}: StormParticlesProps) {
  const pointsRef = useRef<Points>(null);

  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Deterministic pseudo-random distribution
      const s1 = Math.sin(i * 12.9898 + 1) * 43758.5453;
      const s2 = Math.sin(i * 78.233 + 2) * 43758.5453;
      const s3 = Math.sin(i * 39.425 + 3) * 43758.5453;
      const fx = s1 - Math.floor(s1);
      const fy = s2 - Math.floor(s2);
      const fz = s3 - Math.floor(s3);
      positions[i * 3] = (fx - 0.5) * 14;
      positions[i * 3 + 1] = (fy - 0.5) * 8;
      positions[i * 3 + 2] = (fz - 0.5) * 10;
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(positions, 3));
    return geo;
  }, [count]);

  useFrame((_, delta) => {
    if (!active || reducedMotion || !pointsRef.current) return;
    const posAttr = pointsRef.current.geometry.getAttribute('position') as BufferAttribute;
    const arr = posAttr.array as Float32Array;
    const step = delta * 9.5;
    for (let i = 0; i < count; i++) {
      arr[i * 3] += step;
      if (arr[i * 3] > 7) {
        arr[i * 3] = -7;
      }
    }
    posAttr.needsUpdate = true;
  });

  if (!active) return null;

  return (
    <points ref={pointsRef} name="event_storm_particles" geometry={geometry}>
      <pointsMaterial
        color="#ffb547"
        size={0.14}
        transparent
        opacity={0.82}
        blending={AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
