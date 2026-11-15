'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { AdditiveBlending, DoubleSide, type Group } from 'three';

export interface ImpactBurstProps {
  active: boolean;
  reducedMotion?: boolean;
  position?: [number, number, number];
}

/** Expanding spark and debris burst when a micrometeoroid hit or mechanical anomaly occurs. */
export function ImpactBurst({
  active,
  reducedMotion = false,
  position = [1.1, 0.25, 0.35],
}: ImpactBurstProps) {
  const groupRef = useRef<Group>(null);

  const shards = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const theta = (i / 14) * Math.PI * 2;
        const phi = ((i % 5) - 2) * 0.35;
        return {
          id: i,
          dir: [
            Math.cos(theta) * Math.cos(phi),
            Math.sin(phi),
            Math.sin(theta) * Math.cos(phi),
          ] as [number, number, number],
        };
      }),
    [],
  );

  useFrame(({ clock }) => {
    if (!active || !groupRef.current) return;
    const t = reducedMotion ? 0.55 : (clock.getElapsedTime() * 1.1) % 1;
    const scale = 0.35 + t * 1.35;
    groupRef.current.scale.setScalar(scale);
  });

  if (!active) return null;

  return (
    <group name="event_impact_burst" position={position}>
      <group ref={groupRef}>
        <mesh rotation={[Math.PI / 3, 0.3, 0]}>
          <ringGeometry args={[0.35, 0.52, 28]} />
          <meshBasicMaterial
            color="#ff9f43"
            transparent
            opacity={0.78}
            side={DoubleSide}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
        {shards.map((shard) => (
          <mesh
            key={shard.id}
            position={[
              shard.dir[0] * 0.65,
              shard.dir[1] * 0.65,
              shard.dir[2] * 0.65,
            ]}
          >
            <octahedronGeometry args={[0.075, 0]} />
            <meshBasicMaterial
              color="#ffe066"
              transparent
              opacity={0.9}
              blending={AdditiveBlending}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}
