'use client';

import { useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { AdditiveBlending, BackSide, SRGBColorSpace, type Mesh } from 'three';

interface SimplePlanetProps {
  texture: string;
  radius: number;
  /** Spin speed, rad/s. */
  spin?: number;
  /** Thin atmosphere rim colour. */
  atmosphere?: string;
  position?: [number, number, number];
}

/** A lit, textured planet for maps and holograms (lighter than the full Earth shader). */
export function SimplePlanet({ texture, radius, spin = 0.1, atmosphere, position }: SimplePlanetProps) {
  const map = useTexture(texture, (loaded) => {
    loaded.colorSpace = SRGBColorSpace;
    loaded.anisotropy = 4;
    loaded.needsUpdate = true;
  });
  const body = useRef<Mesh>(null);
  useFrame((_, delta) => {
    if (body.current) body.current.rotation.y += delta * spin;
  });
  return (
    <group position={position}>
      <mesh ref={body}>
        <sphereGeometry args={[radius, 48, 48]} />
        <meshStandardMaterial map={map} roughness={0.9} metalness={0} />
      </mesh>
      {atmosphere && (
        <mesh scale={1.12}>
          <sphereGeometry args={[radius, 32, 32]} />
          <meshBasicMaterial color={atmosphere} transparent opacity={0.18} side={BackSide} blending={AdditiveBlending} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}
