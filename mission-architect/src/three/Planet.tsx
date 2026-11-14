'use client';

import { useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { Color, type Group, type Mesh, NoColorSpace, SRGBColorSpace, type Texture, type Vector3 } from 'three';

import { Atmosphere } from './Atmosphere';

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

// Lighting is done in view space. The Sun is one directional light.
//   day side   = day map x diffuse light (+ ocean glint from the specular map)
//   night side = night map (city lights), faded in across the terminator
//   limb       = thin atmosphere tint on the lit side
const fragmentShader = /* glsl */ `
  uniform sampler2D uDayMap;
  uniform sampler2D uNightMap;
  uniform sampler2D uSpecularMap;
  uniform sampler2D uNormalMap;
  uniform float uHasNight;
  uniform float uHasSpecular;
  uniform float uHasNormal;
  uniform float uNormalScale;
  uniform float uSunIntensity;
  uniform vec3 uSunDirection;
  uniform vec3 uAtmosphereColor;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  // Tangent frame from screen-space derivatives (no tangent attribute needed).
  vec3 perturbNormal(vec3 eyePosition, vec3 surfaceNormal, vec3 mapNormal) {
    vec3 q0 = dFdx(eyePosition);
    vec3 q1 = dFdy(eyePosition);
    vec2 st0 = dFdx(vUv);
    vec2 st1 = dFdy(vUv);
    // Skip the texture seam, where the UV derivative jumps.
    if (abs(st0.x) > 0.25 || abs(st1.x) > 0.25) return surfaceNormal;
    vec3 q1perp = cross(q1, surfaceNormal);
    vec3 q0perp = cross(surfaceNormal, q0);
    vec3 tangent = q1perp * st0.x + q0perp * st1.x;
    vec3 bitangent = q1perp * st0.y + q0perp * st1.y;
    float det = max(dot(tangent, tangent), dot(bitangent, bitangent));
    float scale = det == 0.0 ? 0.0 : inversesqrt(det);
    return normalize(tangent * (mapNormal.x * scale) + bitangent * (mapNormal.y * scale) + surfaceNormal * mapNormal.z);
  }

  void main() {
    vec3 geometryNormal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);
    vec3 sunDir = normalize((viewMatrix * vec4(uSunDirection, 0.0)).xyz);

    vec3 normal = geometryNormal;
    if (uHasNormal > 0.5) {
      vec3 mapNormal = texture2D(uNormalMap, vUv).xyz * 2.0 - 1.0;
      mapNormal.xy *= uNormalScale;
      normal = perturbNormal(-vViewPosition, geometryNormal, mapNormal);
    }

    float geometryLight = dot(geometryNormal, sunDir);
    float dayAmount = smoothstep(-0.12, 0.22, geometryLight);
    float diffuse = max(dot(normal, sunDir), 0.0);

    vec3 dayColor = texture2D(uDayMap, vUv).rgb;
    vec3 color = dayColor * (diffuse * uSunIntensity * dayAmount + 0.012);

    if (uHasSpecular > 0.5) {
      float water = texture2D(uSpecularMap, vUv).r;
      vec3 halfDir = normalize(sunDir + viewDir);
      float glint = pow(max(dot(geometryNormal, halfDir), 0.0), 60.0);
      color += vec3(1.0, 0.96, 0.88) * glint * water * 0.55 * dayAmount;
    }

    if (uHasNight > 0.5) {
      vec3 lights = texture2D(uNightMap, vUv).rgb;
      color += lights * (1.0 - dayAmount) * 1.35;
    }

    float fresnel = pow(1.0 - max(dot(geometryNormal, viewDir), 0.0), 3.2);
    color += uAtmosphereColor * fresnel * (0.08 + 0.92 * dayAmount) * 0.7;

    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export interface PlanetTextures {
  /** Surface colour (equirectangular). */
  map: string;
  /** City lights for the night side. */
  nightMap?: string;
  /** White where the surface is shiny (oceans). */
  specularMap?: string;
  /** Tangent-space normal map for terrain relief. */
  normalMap?: string;
  /** Greyscale cloud cover, drawn as a second sphere. */
  cloudsMap?: string;
}

export interface PlanetProps {
  textures: PlanetTextures;
  /** Radius in scene units. */
  radius: number;
  sunDirection: Vector3;
  /** Spin in radians per second. */
  rotationSpeed?: number;
  /** Axial tilt in radians. */
  tilt?: number;
  /** Atmosphere colour. Leave out for airless bodies. */
  atmosphereColor?: string;
  normalScale?: number;
  sunIntensity?: number;
  /** Sphere segments. Lower it for small or distant planets. */
  segments?: number;
}

const BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

function configure(texture: Texture, colorSpace: typeof SRGBColorSpace | typeof NoColorSpace) {
  texture.colorSpace = colorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
}

/** A textured, sun-lit planet with optional night lights, oceans, clouds and atmosphere. */
export function Planet({
  textures,
  radius,
  sunDirection,
  rotationSpeed = 0.02,
  tilt = 0,
  atmosphereColor,
  normalScale = 1.6,
  sunIntensity = 1.9,
  segments = 96,
}: PlanetProps) {
  const spin = useRef<Group>(null);
  const clouds = useRef<Mesh>(null);

  const [dayMap, nightMap, specularMap, normalMap, cloudsMap] = useTexture(
    [
      textures.map,
      textures.nightMap ?? BLANK,
      textures.specularMap ?? BLANK,
      textures.normalMap ?? BLANK,
      textures.cloudsMap ?? BLANK,
    ],
    (loaded) => {
      const [day, night, specular, normal, cloud] = loaded;
      configure(day, SRGBColorSpace);
      configure(night, SRGBColorSpace);
      configure(specular, NoColorSpace);
      configure(normal, NoColorSpace);
      configure(cloud, NoColorSpace);
    },
  );

  const uniforms = useMemo(
    () => ({
      uDayMap: { value: dayMap },
      uNightMap: { value: nightMap },
      uSpecularMap: { value: specularMap },
      uNormalMap: { value: normalMap },
      uHasNight: { value: textures.nightMap ? 1 : 0 },
      uHasSpecular: { value: textures.specularMap ? 1 : 0 },
      uHasNormal: { value: textures.normalMap ? 1 : 0 },
      uNormalScale: { value: normalScale },
      uSunIntensity: { value: sunIntensity },
      uSunDirection: { value: sunDirection },
      uAtmosphereColor: { value: new Color(atmosphereColor ?? '#000000') },
    }),
    [dayMap, nightMap, specularMap, normalMap, textures, normalScale, sunIntensity, sunDirection, atmosphereColor],
  );

  useFrame((_, delta) => {
    if (spin.current) spin.current.rotation.y += rotationSpeed * delta;
    // Clouds drift slightly faster than the surface.
    if (clouds.current) clouds.current.rotation.y += rotationSpeed * 0.25 * delta;
  });

  return (
    <group rotation={[0, 0, tilt]}>
      <group ref={spin}>
        <mesh>
          <sphereGeometry args={[radius, segments, segments]} />
          <shaderMaterial vertexShader={vertexShader} fragmentShader={fragmentShader} uniforms={uniforms} />
        </mesh>
        {textures.cloudsMap && (
          <mesh ref={clouds} scale={1.012}>
            <sphereGeometry args={[radius, segments, segments]} />
            <meshLambertMaterial color="#ffffff" alphaMap={cloudsMap} transparent depthWrite={false} />
          </mesh>
        )}
      </group>
      {atmosphereColor && <Atmosphere radius={radius} color={atmosphereColor} sunDirection={sunDirection} />}
    </group>
  );
}
