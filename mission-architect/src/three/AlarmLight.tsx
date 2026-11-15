'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { AdditiveBlending, DoubleSide, type Mesh, type PointLight } from 'three';

export interface AlarmLightProps {
  active: boolean;
  color?: string;
  reducedMotion?: boolean;
  position?: [number, number, number];
}

/** Pulsing emergency alarm light and beacon halo around the spacecraft during in-flight anomalies. */
export function AlarmLight({
  active,
  color = '#ff4b5c',
  reducedMotion = false,
  position = [0, 0.8, 0],
}: AlarmLightProps) {
  const lightRef = useRef<PointLight>(null);
  const ringRef = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    if (!active) return;
    const t = clock.getElapsedTime();
    const pulse = reducedMotion ? 0.75 : 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * 6.5));
    if (lightRef.current) {
      lightRef.current.intensity = pulse * 6;
    }
    if (ringRef.current) {
      const scale = reducedMotion ? 1.1 : 0.95 + 0.35 * ((t * 0.9) % 1);
      ringRef.current.scale.setScalar(scale);
    }
  });

  if (!active) return null;

  return (
    <group name="event_alarm_light" position={position}>
      <pointLight ref={lightRef} color={color} intensity={4.5} distance={12} decay={1.6} />
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.6, 1.85, 48]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.42}
          side={DoubleSide}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
