'use client';

import { CameraControls, Html, Line } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { QuadraticBezierCurve3, Vector3 } from 'three';

import { isUnlocked } from '@/game/core/progress';
import { gameData } from '@/game/data/loadData';
import type { PathwayId } from '@/game/types';
import { useGame } from '@/hooks/useGame';
import { TEXTURES } from '@/three/constants';
import { Heliosphere } from '@/three/Heliosphere';
import { SimplePlanet } from '@/three/SimplePlanet';
import { Starfield } from '@/three/Starfield';
import { Glow, Sun } from '@/three/Sun';

import {
  EARTH,
  HELIOPAUSE_RADIUS,
  JUPITER,
  L2_OFFSET,
  MARS,
  MOON_OFFSET,
  ORBIT_RADII,
  OVERVIEW_CAMERA,
  OVERVIEW_TARGET,
  PATHWAY_SPOTS,
  TRAPPIST,
} from './mapLayout';
import { mapStore, unlockAllFromUrl, useMap } from './mapStore';
import { SceneBackground } from '@/three/SceneBackground';

function circle(radius: number, segments = 160): [number, number, number][] {
  return Array.from({ length: segments + 1 }, (_, i) => {
    const angle = (i / segments) * Math.PI * 2;
    return [Math.cos(angle) * radius, 0, Math.sin(angle) * radius];
  });
}

/** A gently curved route from Earth to a destination. */
function routePoints(to: readonly number[], lift = 2): Vector3[] {
  const start = new Vector3(...EARTH);
  const end = new Vector3(to[0], to[1], to[2]);
  const middle = start.clone().lerp(end, 0.5).add(new Vector3(0, lift + start.distanceTo(end) * 0.12, 0));
  return new QuadraticBezierCurve3(start, middle, end).getPoints(64);
}

function add(a: readonly number[], b: readonly number[]): [number, number, number] {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function Marker({ id }: { id: PathwayId }) {
  const pathway = gameData.pathwayById.get(id);
  const progress = useGame((state) => state.profile.progress);
  const focused = useMap((state) => state.focused === id);
  const unlocked = isUnlocked(id, progress, unlockAllFromUrl());
  const stars = progress[id]?.stars ?? 0;
  if (!pathway) return null;
  return (
    <Html position={PATHWAY_SPOTS[id].marker} center zIndexRange={[5, 0]}>
      <button
        type="button"
        data-pathway={id}
        aria-label={`Chapter ${pathway.chapter}: ${pathway.name}, ${pathway.destination}${unlocked ? '' : ', locked'}`}
        aria-pressed={focused}
        onClick={() => mapStore.getState().focus(id)}
        onMouseEnter={() => mapStore.getState().focus(id)}
        onFocus={() => mapStore.getState().focus(id)}
        className={`flex items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-bold tracking-[0.08em] shadow-lg backdrop-blur transition focus-visible:outline-2 focus-visible:outline-accent ${
          focused
            ? 'border-accent bg-accent/25 text-ink'
            : unlocked
              ? 'border-line bg-panel text-ink hover:border-accent'
              : 'border-white/15 bg-black/60 text-muted'
        }`}
      >
        <span className="text-xs text-accent">{pathway.chapter}</span>
        {pathway.name}
        {!unlocked && <span aria-hidden>🔒</span>}
        {unlocked && stars > 0 && <span className="text-warn">{'★'.repeat(stars)}</span>}
      </button>
    </Html>
  );
}

/** Chapter select: the Solar System as a map of mission pathways (not to scale). */
export function PathwayMapScene() {
  const controls = useRef<CameraControls>(null);
  const focused = useMap((state) => state.focused);
  const reducedMotion = useGame((state) => state.settings.reducedMotion);
  const aspect = useThree((state) => state.size.width / Math.max(1, state.size.height));
  // Tall (portrait) screens need the camera further back to fit the map.
  const distanceFactor = aspect < 1 ? Math.min(2.6, 1.25 / aspect) : 1;

  const routes = useMemo(
    () => ({
      moon: routePoints(add(EARTH, MOON_OFFSET), 0.2),
      mars: routePoints(MARS),
      jupiter: routePoints(JUPITER, 3),
      interstellar: routePoints(PATHWAY_SPOTS.interstellar.marker, 4),
      l2: routePoints(add(EARTH, L2_OFFSET), 0.2),
    }),
    [],
  );

  useEffect(() => () => mapStore.getState().focus(null), []);

  useEffect(() => {
    const camera = controls.current;
    if (!camera) return;
    const spot = focused ? PATHWAY_SPOTS[focused] : null;
    const base = spot?.camera ?? OVERVIEW_CAMERA;
    const target = spot?.target ?? spot?.marker ?? OVERVIEW_TARGET;
    const position = base.map((value, i) => target[i] + (value - target[i]) * distanceFactor);
    void camera.setLookAt(position[0], position[1], position[2], target[0], target[1], target[2], !reducedMotion);
  }, [focused, reducedMotion, distanceFactor]);

  return (
    <>
      <SceneBackground />
      <Starfield count={2400} milkyWay={0.35} seed={4} />
      <ambientLight intensity={0.08} />
      <Sun radius={1.8} />

      {/* orbits */}
      <Line points={circle(ORBIT_RADII.earth)} color="#3d7bff" lineWidth={1.2} transparent opacity={0.6} />
      <Line points={circle(ORBIT_RADII.mars)} color="#ff8a5a" lineWidth={1.2} transparent opacity={0.5} />
      <Line points={circle(ORBIT_RADII.jupiter)} color="#e8c39e" lineWidth={1.2} transparent opacity={0.45} />

      {/* worlds */}
      <SimplePlanet texture={TEXTURES.earthDay} radius={0.5} position={EARTH} spin={0.3} atmosphere="#5aa8ff" />
      <SimplePlanet texture={TEXTURES.moon} radius={0.15} position={add(EARTH, MOON_OFFSET)} spin={0.05} />
      <SimplePlanet texture={TEXTURES.mars} radius={0.38} position={MARS} spin={0.25} atmosphere="#ff9a6a" />
      <SimplePlanet texture={TEXTURES.jupiter} radius={1.3} position={JUPITER} spin={0.4} />
      <group position={add(EARTH, L2_OFFSET)}>
        <mesh rotation={[0, 0, Math.PI / 4]}>
          <octahedronGeometry args={[0.12, 0]} />
          <meshBasicMaterial color="#b48cff" toneMapped={false} />
        </mesh>
      </group>

      {/* routes from Earth */}
      <Line points={routes.moon} color="#d6d6d0" lineWidth={1} dashed dashSize={0.15} gapSize={0.1} />
      <Line points={routes.l2} color="#b48cff" lineWidth={1} dashed dashSize={0.15} gapSize={0.1} />
      <Line points={routes.mars} color="#ff8a5a" lineWidth={1.4} dashed dashSize={0.4} gapSize={0.25} />
      <Line points={routes.jupiter} color="#e8c39e" lineWidth={1.4} dashed dashSize={0.4} gapSize={0.25} />
      <Line points={routes.interstellar} color="#5ce1ff" lineWidth={1.4} dashed dashSize={0.5} gapSize={0.3} />

      {/* the edge of the Sun's bubble, and a star system beyond it */}
      <Heliosphere radius={HELIOPAUSE_RADIUS} opacity={0.22} />
      <group position={TRAPPIST}>
        <Glow size={3.2} inner="rgba(255,190,150,1)" outer="rgba(255,80,40,0.45)" />
        {[0.9, 1.4, 2].map((radius, i) => (
          <mesh key={radius} position={[Math.cos(i * 2.1) * radius, 0, Math.sin(i * 2.1) * radius]}>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshStandardMaterial color={['#c98f6b', '#8fa6c9', '#b9c48a'][i]} emissive="#331100" />
          </mesh>
        ))}
      </group>
      <Line points={[add(EARTH, L2_OFFSET), TRAPPIST]} color="#b48cff" lineWidth={1} dashed dashSize={0.2} gapSize={0.6} transparent opacity={0.6} />

      {gameData.pathways.map((pathway) => (
        <Marker key={pathway.id} id={pathway.id} />
      ))}

      <CameraControls
        ref={controls}
        makeDefault
        minDistance={3}
        maxDistance={70}
        maxPolarAngle={Math.PI * 0.48}
        smoothTime={reducedMotion ? 0 : 0.6}
      />
    </>
  );
}
