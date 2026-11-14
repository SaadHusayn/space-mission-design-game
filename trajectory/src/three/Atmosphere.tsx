'use client';

import { useMemo } from 'react';
import { AdditiveBlending, BackSide, Color, type Vector3 } from 'three';

const vertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

// The shell is drawn from the inside (back faces). A ray that just grazes the
// planet meets the shell where -dot(N, V) = sqrt(1 - 1/k^2), k = shell scale.
// The glow is strongest there and fades to zero at the shell's outer edge.
const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uSunDirection;
  uniform float uEdge;
  uniform float uIntensity;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);
    float rim = clamp(-dot(normal, viewDir) / uEdge, 0.0, 1.0);
    float glow = pow(rim, 2.6);
    vec3 sunDir = normalize((viewMatrix * vec4(uSunDirection, 0.0)).xyz);
    float day = smoothstep(-0.45, 0.55, dot(normal, sunDir));
    gl_FragColor = vec4(uColor * glow * day * uIntensity, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

interface AtmosphereProps {
  /** Planet radius in scene units. */
  radius: number;
  /** Shell size relative to the planet radius. */
  scale?: number;
  color?: string;
  intensity?: number;
  sunDirection: Vector3;
}

/** Soft glow around a planet's limb, on the sunlit side only. */
export function Atmosphere({ radius, scale = 1.14, color = '#5aa8ff', intensity = 1.25, sunDirection }: AtmosphereProps) {
  const uniforms = useMemo(
    () => ({
      uColor: { value: new Color(color) },
      uSunDirection: { value: sunDirection },
      uEdge: { value: Math.sqrt(1 - 1 / (scale * scale)) },
      uIntensity: { value: intensity },
    }),
    [color, intensity, scale, sunDirection],
  );

  return (
    <mesh scale={scale}>
      <sphereGeometry args={[radius, 64, 64]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        side={BackSide}
        blending={AdditiveBlending}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}
