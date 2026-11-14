'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { Vector3 } from 'three';

interface CameraRigProps {
  /** Camera position on wide screens. */
  position: [number, number, number];
  /** Point the camera looks at on wide screens. */
  target: [number, number, number];
  /** Camera position and target on tall (portrait) screens. */
  portrait?: { position: [number, number, number]; target: [number, number, number] };
  /** Slow sway around the base position. 0 keeps the camera still. */
  drift?: number;
}

const scratch = new Vector3();

/** Places the camera for a scene and adds a slow cinematic drift. */
export function CameraRig({ position, target, portrait, drift = 1 }: CameraRigProps) {
  const time = useRef(0);

  useFrame((state, delta) => {
    time.current += delta;
    const tall = portrait && state.size.width / state.size.height < 1;
    const base = tall ? portrait.position : position;
    const lookAt = tall ? portrait.target : target;
    const t = time.current;
    state.camera.position.set(
      base[0] + Math.sin(t * 0.07) * 0.35 * drift,
      base[1] + Math.sin(t * 0.05 + 1.3) * 0.16 * drift,
      base[2],
    );
    state.camera.lookAt(scratch.set(lookAt[0], lookAt[1], lookAt[2]));
  });

  return null;
}
