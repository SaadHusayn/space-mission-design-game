'use client';

import { useMemo } from 'react';
import { AdditiveBlending, Color, DoubleSide } from 'three';

const vertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float rim = 1.0 - abs(dot(normalize(vNormal), normalize(vView)));
    gl_FragColor = vec4(uColor, pow(rim, 3.0) * uOpacity);
  }
`;

/** The Sun's bubble (heliosphere): a faint shell that glows at its edge. */
export function Heliosphere({ radius, color = '#5ce1ff', opacity = 0.55 }: { radius: number; color?: string; opacity?: number }) {
  const uniforms = useMemo(() => ({ uColor: { value: new Color(color) }, uOpacity: { value: opacity } }), [color, opacity]);
  return (
    <mesh scale={[1, 0.85, 1.25]}>
      <sphereGeometry args={[radius, 64, 64]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={DoubleSide}
        blending={AdditiveBlending}
      />
    </mesh>
  );
}
