'use client';

import { useTexture } from '@react-three/drei';
import { useMemo } from 'react';
import { BackSide, BufferAttribute, BufferGeometry, Color, SRGBColorSpace } from 'three';

import { createRng } from '@/game/core/rng';

import { TEXTURES } from './constants';

interface StarfieldProps {
  /** Number of point stars drawn on top of the Milky Way panorama. */
  count?: number;
  /** Brightness of the Milky Way panorama (0..1). */
  milkyWay?: number;
  seed?: number;
}

const STAR_TINTS = [
  [1.0, 1.0, 1.0],
  [0.78, 0.86, 1.0],
  [1.0, 0.9, 0.76],
] as const;

/** Space background: a dim Milky Way panorama plus seeded point stars. */
export function Starfield({ count = 2600, milkyWay = 0.42, seed = 7 }: StarfieldProps) {
  const panorama = useTexture(TEXTURES.milkyWay, (texture) => {
    texture.colorSpace = SRGBColorSpace;
    texture.needsUpdate = true;
  });

  const geometry = useMemo(() => {
    const rng = createRng(seed);
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Uniform direction on a sphere.
      const z = rng.range(-1, 1);
      const angle = rng.range(0, Math.PI * 2);
      const ring = Math.sqrt(1 - z * z);
      const distance = 700;
      positions.set([ring * Math.cos(angle) * distance, z * distance, ring * Math.sin(angle) * distance], i * 3);
      const tint = STAR_TINTS[rng.chance(0.7) ? 0 : rng.int(1, 2)];
      const brightness = 0.25 + 0.75 * rng.next() ** 2.2;
      colors.set([tint[0] * brightness, tint[1] * brightness, tint[2] * brightness], i * 3);
    }
    const result = new BufferGeometry();
    result.setAttribute('position', new BufferAttribute(positions, 3));
    result.setAttribute('color', new BufferAttribute(colors, 3));
    return result;
  }, [count, seed]);

  const panoramaTint = useMemo(() => new Color().setScalar(milkyWay), [milkyWay]);

  return (
    <group>
      <mesh rotation={[0.4, 1.9, 0.25]}>
        <sphereGeometry args={[900, 48, 24]} />
        <meshBasicMaterial map={panorama} side={BackSide} color={panoramaTint} depthWrite={false} toneMapped={false} />
      </mesh>
      <points geometry={geometry}>
        <pointsMaterial size={1.6} sizeAttenuation={false} vertexColors transparent depthWrite={false} toneMapped={false} />
      </points>
    </group>
  );
}
