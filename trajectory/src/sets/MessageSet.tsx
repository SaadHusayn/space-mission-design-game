'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group, MeshBasicMaterial } from 'three';

import { HangarSet } from './HangarSet';

/** The dimmed hangar with a large hologram transmission from the agency. */
export function MessageSet() {
  const rings = useRef<Group>(null);
  const glow = useRef<MeshBasicMaterial>(null);
  const time = useRef(0);
  useFrame((_, delta) => {
    time.current += delta;
    if (rings.current) rings.current.rotation.z += delta * 0.3;
    if (glow.current) glow.current.opacity = 0.16 + Math.sin(time.current * 7) * 0.02 + (Math.sin(time.current * 31) > 0.97 ? 0.08 : 0);
  });
  return (
    <HangarSet brightness={0.35} holoTable={false}>
      <group position={[0, 2.1, 0]}>
        <mesh>
          <planeGeometry args={[5.2, 3]} />
          <meshBasicMaterial ref={glow} color="#5ce1ff" transparent opacity={0.16} toneMapped={false} depthWrite={false} />
        </mesh>
        <group ref={rings}>
          {[0.55, 0.8, 1.05].map((radius, i) => (
            <mesh key={radius} rotation={[0, 0, i * 0.7]}>
              <ringGeometry args={[radius, radius + 0.04, 64, 1, 0, Math.PI * (1.2 + i * 0.25)]} />
              <meshBasicMaterial color={i === 1 ? '#ffb547' : '#5ce1ff'} toneMapped={false} transparent opacity={0.9} />
            </mesh>
          ))}
        </group>
        <mesh>
          <circleGeometry args={[0.28, 48]} />
          <meshBasicMaterial color="#e8f1ff" toneMapped={false} />
        </mesh>
        <pointLight position={[0, 0, 1]} color="#5ce1ff" intensity={8} distance={8} />
      </group>
      {/* projector */}
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.7, 0.9, 0.4, 32]} />
        <meshStandardMaterial color="#1a2233" metalness={0.6} roughness={0.4} />
      </mesh>
    </HangarSet>
  );
}
