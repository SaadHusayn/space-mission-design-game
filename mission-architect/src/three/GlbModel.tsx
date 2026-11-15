'use client';

import { useGLTF } from '@react-three/drei';
import { useFrame, type ThreeElements } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { Box3, Vector3, type Group } from 'three';

export interface GlbModelProps {
  url: string;
  /** Target size in scene units. */
  targetSize?: number;
  /** Whether to fit by bounding box height ('height') or max dimension ('max'). */
  fit?: 'max' | 'height';
  /** 'center' centers X/Y/Z at origin; 'bottom' rests min.y at y = 0. */
  anchor?: 'center' | 'bottom';
  /** Optional Y-axis spin in rad/s. */
  spin?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  groupProps?: ThreeElements['group'];
}

/**
 * Loads a local .glb asset (with bundled Meshopt + local /draco/ decoder),
 * clones it per instance, and auto-normalizes scale and origin so every
 * NASA 3D model fits Mission Architect's scene coordinates reliably.
 */
export function GlbModel({
  url,
  targetSize = 2,
  fit = 'max',
  anchor = 'center',
  spin = 0,
  position,
  rotation,
  groupProps,
}: GlbModelProps) {
  const { scene } = useGLTF(url, '/draco/', true);
  const spinRef = useRef<Group>(null);

  const { model, scale, offset } = useMemo(() => {
    const cloned = scene.clone(true);
    cloned.updateMatrixWorld(true);
    const box = new Box3().setFromObject(cloned);
    const size = new Vector3();
    const center = new Vector3();
    box.getSize(size);
    box.getCenter(center);

    const refDim =
      fit === 'height'
        ? Math.max(size.y, 0.001)
        : Math.max(size.x, size.y, size.z, 0.001);
    const s = targetSize / refDim;

    const offsetX = -center.x * s;
    const offsetZ = -center.z * s;
    const offsetY = anchor === 'bottom' ? -box.min.y * s : -center.y * s;

    return {
      model: cloned,
      scale: s,
      offset: [offsetX, offsetY, offsetZ] as [number, number, number],
    };
  }, [scene, targetSize, fit, anchor]);

  useFrame((_, delta) => {
    if (spinRef.current && spin !== 0) {
      spinRef.current.rotation.y += delta * spin;
    }
  });

  return (
    <group ref={spinRef} position={position} rotation={rotation} {...groupProps}>
      <group position={offset} scale={scale}>
        <primitive object={model} />
      </group>
    </group>
  );
}
