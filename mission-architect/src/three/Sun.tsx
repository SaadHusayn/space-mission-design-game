'use client';

import { useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Suspense, useMemo, useRef } from 'react';
import { AdditiveBlending, CanvasTexture, SRGBColorSpace, type Mesh } from 'three';

import { MODELS, TEXTURES } from './constants';
import { GlbModel } from './GlbModel';

/** Soft round glow texture drawn once on a canvas. */
function useGlowTexture(inner: string, outer: string) {
  return useMemo(() => {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    if (context) {
      const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      gradient.addColorStop(0, inner);
      gradient.addColorStop(0.25, outer);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      context.fillStyle = gradient;
      context.fillRect(0, 0, size, size);
    }
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    return texture;
  }, [inner, outer]);
}

/** A glowing sprite (sun corona, star, marker halo). */
export function Glow({ size, inner = 'rgba(255,240,200,1)', outer = 'rgba(255,170,60,0.35)', opacity = 1 }: { size: number; inner?: string; outer?: string; opacity?: number }) {
  const texture = useGlowTexture(inner, outer);
  return (
    <sprite scale={[size, size, 1]}>
      <spriteMaterial map={texture} blending={AdditiveBlending} depthWrite={false} transparent opacity={opacity} toneMapped={false} />
    </sprite>
  );
}

/** The Sun: textured, self-lit, with a corona and a point light. */
export function Sun({ radius = 2, light = true }: { radius?: number; light?: boolean }) {
  const map = useTexture(TEXTURES.sun, (texture) => {
    texture.colorSpace = SRGBColorSpace;
    texture.needsUpdate = true;
  });
  const surface = useRef<Mesh>(null);
  useFrame((_, delta) => {
    if (surface.current) surface.current.rotation.y += delta * 0.03;
  });
  const fallbackSphere = (
    <mesh ref={surface}>
      <sphereGeometry args={[radius, 64, 64]} />
      <meshBasicMaterial map={map} color={[1.6, 1.35, 1.1]} toneMapped={false} />
    </mesh>
  );

  return (
    <group>
      <Suspense fallback={fallbackSphere}>
        <GlbModel url={MODELS.sun} targetSize={radius * 2} spin={0.03} />
      </Suspense>
      <Glow size={radius * 6} />
      {light && <pointLight intensity={2.5} distance={0} decay={0} color="#fff3e0" />}
    </group>
  );
}
