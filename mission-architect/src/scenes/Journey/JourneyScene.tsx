'use client';

import { Html, Line, OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { AdditiveBlending, DoubleSide, type Group, QuadraticBezierCurve3, Vector3 } from 'three';

import { emptyDesign, getEventCatalogueEntry, liveTelemetry } from '@/game';
import type { Design, PathwayId } from '@/game/types';
import { useGame } from '@/hooks/useGame';
import { AlarmLight } from '@/three/AlarmLight';
import { SUN_DIRECTION, TEXTURES } from '@/three/constants';
import { Heliosphere } from '@/three/Heliosphere';
import { ImpactBurst } from '@/three/ImpactBurst';
import { Planet } from '@/three/Planet';
import { SceneBackground } from '@/three/SceneBackground';
import { SimplePlanet } from '@/three/SimplePlanet';
import { Spacecraft } from '@/three/Spacecraft';
import { Starfield } from '@/three/Starfield';
import { StormParticles } from '@/three/StormParticles';
import { Glow, Sun } from '@/three/Sun';
import { SunLight } from '@/three/SunLight';

import { useJourneyView } from './journeyViewStore';

const EARTH_TEXTURES = {
  map: TEXTURES.earthDay,
  nightMap: TEXTURES.earthNight,
  specularMap: TEXTURES.earthSpecular,
  normalMap: TEXTURES.earthNormal,
  cloudsMap: TEXTURES.earthClouds,
};

function circlePoints(radius: number, inclinationRad = 0, segments = 96): [number, number, number][] {
  return Array.from({ length: segments + 1 }, (_, i) => {
    const a = (i / segments) * Math.PI * 2;
    const x = Math.cos(a) * radius;
    const z = Math.sin(a) * radius;
    const y = Math.sin(a) * radius * Math.sin(inclinationRad);
    return [x, y, z * Math.cos(inclinationRad)];
  });
}

/** Glowing orange-red plasma wake during atmospheric re-entry. */
function ReentryPlasmaShell({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <group position={[0, -1.65, 0]}>
      <mesh>
        <coneGeometry args={[2.1, 2.6, 32, 1, true]} />
        <meshBasicMaterial
          color="#ff6b2b"
          transparent
          opacity={0.42}
          side={DoubleSide}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <Glow size={4.2} inner="rgba(255,150,70,0.85)" outer="rgba(255,60,10,0)" />
    </group>
  );
}

/** Rotating spacecraft wrapper that spins at the player's habitat RPM and shows a downlink beam. */
function InFlightSpacecraft({
  design,
  spinRpm,
  downlinkActive,
  reentryActive,
  reducedMotion,
  scale = 0.25,
  position = [0, 0, 0],
}: {
  design: Design;
  spinRpm: number;
  downlinkActive: boolean;
  reentryActive: boolean;
  reducedMotion: boolean;
  scale?: number;
  position?: [number, number, number];
}) {
  const groupRef = useRef<Group>(null);
  useFrame((_, delta) => {
    if (!groupRef.current || reducedMotion) return;
    const omega = spinRpm > 0 ? (spinRpm * 2 * Math.PI) / 60 : 0.18;
    groupRef.current.rotation.y += omega * delta;
  });

  return (
    <group position={position} scale={scale}>
      <group ref={groupRef}>
        <Spacecraft design={design} selectedTarget="bus" hoveredTarget={null} position={[0, 0, 0]} />
        <ReentryPlasmaShell active={reentryActive} />
      </group>
      {downlinkActive && (
        <Line
          points={[
            [0, 1.4, 0],
            [-6, 3.2, -4],
          ]}
          color="#5ce1ff"
          lineWidth={1.6}
          dashed
          dashSize={0.4}
          gapSize={0.25}
          transparent
          opacity={0.75}
        />
      )}
    </group>
  );
}

/** 1. System Map View: 3D heliocentric / transfer trajectory overview with live spacecraft position. */
function SystemMapView({
  pathwayId,
  progress,
  segment,
  sunDistanceAU,
  day,
  flybyRadii,
  reducedMotion,
}: {
  pathwayId: PathwayId;
  progress: number;
  segment: string;
  sunDistanceAU: number;
  day: number;
  flybyRadii: number | null;
  reducedMotion: boolean;
}) {
  const earthPos = useMemo(() => new Vector3(4.2, 0, 0), []);
  const destPos = useMemo(() => {
    switch (pathwayId) {
      case 'leo':
        return new Vector3(4.55, 0.2, 0.35);
      case 'moon':
        return new Vector3(5.35, 0.3, 0.9);
      case 'mars':
        return new Vector3(1.2, 0.2, -7.2);
      case 'jupiter':
        return new Vector3(-9.5, 0.35, -6.4);
      case 'interstellar':
        return new Vector3(-14.5, 1.2, 9.5);
      case 'exoplanet':
        return new Vector3(5.4, 0.25, -0.8);
    }
  }, [pathwayId]);

  const curvePoints = useMemo(() => {
    const midLift = pathwayId === 'interstellar' ? 3.2 : pathwayId === 'jupiter' ? 2.2 : 1.1;
    // For Jupiter / Interstellar, bend the control point based on flybyRadii (2, 5, or 20 R_J)
    const bendOffset = flybyRadii === 2 ? 2.6 : flybyRadii === 5 ? 1.4 : 0.5;
    const mid = earthPos
      .clone()
      .lerp(destPos, 0.5)
      .add(new Vector3(-bendOffset, midLift, bendOffset * 0.6));
    const curve = new QuadraticBezierCurve3(earthPos, mid, destPos);
    return curve.getPoints(72);
  }, [earthPos, destPos, pathwayId, flybyRadii]);

  const probePos = useMemo(() => {
    const idx = Math.min(
      curvePoints.length - 1,
      Math.max(0, Math.round((segment === 'return' ? 1 - (progress - 0.7) / 0.3 : progress) * (curvePoints.length - 1))),
    );
    return curvePoints[idx] ?? earthPos;
  }, [curvePoints, progress, segment, earthPos]);

  return (
    <group name="journey_system_map">
      <Sun radius={1.25} />
      <Line points={circlePoints(4.2)} color="#38bdf8" lineWidth={1} transparent opacity={0.45} />
      <Line points={circlePoints(7.3)} color="#fb923c" lineWidth={1} transparent opacity={0.35} />
      <Line points={circlePoints(11.5)} color="#eab308" lineWidth={1} transparent opacity={0.3} />

      <SimplePlanet
        texture={TEXTURES.earthDay}
        radius={0.38}
        position={[earthPos.x, earthPos.y, earthPos.z]}
        spin={reducedMotion ? 0 : 0.25}
        atmosphere="#5aa8ff"
      />
      {pathwayId === 'moon' && (
        <SimplePlanet
          texture={TEXTURES.moon}
          radius={0.16}
          position={[destPos.x, destPos.y, destPos.z]}
          spin={reducedMotion ? 0 : 0.08}
        />
      )}
      {pathwayId === 'mars' && (
        <SimplePlanet
          texture={TEXTURES.mars}
          radius={0.32}
          position={[destPos.x, destPos.y, destPos.z]}
          spin={reducedMotion ? 0 : 0.2}
          atmosphere="#ff8a5a"
        />
      )}
      {(pathwayId === 'jupiter' || pathwayId === 'interstellar') && (
        <SimplePlanet
          texture={TEXTURES.jupiter}
          radius={0.85}
          position={[-9.5, 0.35, -6.4]}
          spin={reducedMotion ? 0 : 0.35}
        />
      )}
      {pathwayId === 'interstellar' && <Heliosphere radius={15.2} opacity={0.32} />}

      <Line points={curvePoints} color="#5ce1ff" lineWidth={2.4} />

      <group position={[probePos.x, probePos.y, probePos.z]}>
        <mesh>
          <octahedronGeometry args={[0.22, 0]} />
          <meshBasicMaterial color="#4cf0a0" />
        </mesh>
        <Glow size={1.1} inner="rgba(76,240,160,0.9)" outer="rgba(76,240,160,0)" />
        <Html position={[0, 0.55, 0]} center zIndexRange={[4, 0]}>
          <div className=" pointer-events-none whitespace-nowrap rounded-full border border-accent/60 bg-space/90 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-accent shadow">
            Day {day} · {sunDistanceAU.toFixed(2)} AU
          </div>
        </Html>
      </group>
    </group>
  );
}

/** 2. Spacecraft Close-Up View: Detailed inspection of the player's assembled craft in flight. */
function SpacecraftCloseupView({
  design,
  spinRpm,
  downlinkActive,
  reentryActive,
  reducedMotion,
}: {
  design: Design;
  spinRpm: number;
  downlinkActive: boolean;
  reentryActive: boolean;
  reducedMotion: boolean;
}) {
  return (
    <group name="journey_spacecraft_closeup">
      <InFlightSpacecraft
        design={design}
        spinRpm={spinRpm}
        downlinkActive={downlinkActive}
        reentryActive={reentryActive}
        reducedMotion={reducedMotion}
        scale={0.75}
        position={[0, 0, 0]}
      />
      {spinRpm > 0 && (
        <Html position={[0, 2.35, 0]} center zIndexRange={[4, 0]}>
          <div className="pointer-events-none whitespace-nowrap rounded-full border border-accent/50 bg-space/90 px-3 py-1 font-mono text-xs text-accent">
            Spin Gravity Active: {spinRpm.toFixed(1)} RPM (0.38 g Mars target)
          </div>
        </Html>
      )}
    </group>
  );
}

/** 3A. Ch 1 LEO Destination View: Textured Earth with day/night city lights, terminator & re-entry glow. */
function LeoDestinationView({
  design,
  downlinkActive,
  reentryActive,
  reducedMotion,
  lowQuality,
}: {
  design: Design;
  downlinkActive: boolean;
  reentryActive: boolean;
  reducedMotion: boolean;
  lowQuality: boolean;
}) {
  const orbitRef = useRef<Group>(null);
  useFrame((_, delta) => {
    if (orbitRef.current && !reducedMotion) {
      orbitRef.current.rotation.y += delta * 0.22;
    }
  });

  return (
    <group name="destination_leo">
      <Planet
        textures={EARTH_TEXTURES}
        radius={2.35}
        sunDirection={SUN_DIRECTION}
        rotationSpeed={reducedMotion ? 0 : 0.025}
        tilt={0.41}
        atmosphereColor="#5aa8ff"
        segments={lowQuality ? 64 : 112}
      />
      <Line points={circlePoints(3.15, 0.45)} color="#5ce1ff" lineWidth={1.5} transparent opacity={0.65} />
      <group ref={orbitRef} rotation={[0.45, 0.8, 0]}>
        <InFlightSpacecraft
          design={design}
          spinRpm={0}
          downlinkActive={downlinkActive}
          reentryActive={reentryActive}
          reducedMotion={reducedMotion}
          scale={0.22}
          position={[3.15, 0, 0]}
        />
      </group>
    </group>
  );
}

/** 3B. Ch 2 Moon Destination View: Textured Moon with polar shadowed-crater water-ice rings & Earthrise. */
function MoonDestinationView({
  design,
  trajectoryId,
  downlinkActive,
  reentryActive,
  reducedMotion,
}: {
  design: Design;
  trajectoryId: string;
  downlinkActive: boolean;
  reentryActive: boolean;
  reducedMotion: boolean;
}) {
  const polar = trajectoryId !== 'moon_equatorial';
  const inclination = polar ? Math.PI * 0.48 : 0.12;
  const orbitRef = useRef<Group>(null);
  useFrame((_, delta) => {
    if (orbitRef.current && !reducedMotion) {
      orbitRef.current.rotation.y += delta * 0.18;
    }
  });

  return (
    <group name="destination_moon">
      <SimplePlanet texture={TEXTURES.moon} radius={2.1} spin={reducedMotion ? 0 : 0.015} />
      {/* Polar permanently shadowed crater water-ice highlight rings */}
      <mesh position={[0, 2.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.55, 0.035, 16, 48]} />
        <meshBasicMaterial color="#5ce1ff" transparent opacity={0.85} />
      </mesh>
      <mesh position={[0, -2.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.55, 0.035, 16, 48]} />
        <meshBasicMaterial color="#5ce1ff" transparent opacity={0.85} />
      </mesh>
      <Html position={[0, 2.45, 0]} center zIndexRange={[4, 0]}>
        <div className="pointer-events-none whitespace-nowrap rounded-full border border-accent/50 bg-space/90 px-2.5 py-0.5 font-mono text-[11px] text-accent">
          Shackleton & South Pole Ice Craters
        </div>
      </Html>

      {/* Distant Earthrise in background */}
      <SimplePlanet
        texture={TEXTURES.earthDay}
        radius={0.62}
        position={[-7.5, 2.6, -9.5]}
        spin={reducedMotion ? 0 : 0.05}
        atmosphere="#5aa8ff"
      />

      <Line points={circlePoints(3.05, inclination)} color="#5ce1ff" lineWidth={1.6} transparent opacity={0.7} />
      <group ref={orbitRef}>
        <InFlightSpacecraft
          design={design}
          spinRpm={0}
          downlinkActive={downlinkActive}
          reentryActive={reentryActive}
          reducedMotion={reducedMotion}
          scale={0.22}
          position={[3.05 * Math.cos(0.6), 3.05 * Math.sin(0.6) * Math.sin(inclination), 3.05 * Math.sin(0.6) * Math.cos(inclination)]}
        />
      </group>
    </group>
  );
}

/** 3C. Ch 3 Mars Destination View: Textured Mars with thin orange atmosphere, Phobos/Deimos, and spin habitat. */
function MarsDestinationView({
  design,
  spinRpm,
  downlinkActive,
  reentryActive,
  reducedMotion,
}: {
  design: Design;
  spinRpm: number;
  downlinkActive: boolean;
  reentryActive: boolean;
  reducedMotion: boolean;
}) {
  const orbitRef = useRef<Group>(null);
  useFrame((_, delta) => {
    if (orbitRef.current && !reducedMotion) {
      orbitRef.current.rotation.y += delta * 0.16;
    }
  });

  return (
    <group name="destination_mars">
      <SimplePlanet
        texture={TEXTURES.mars}
        radius={2.15}
        spin={reducedMotion ? 0 : 0.025}
        atmosphere="#ff8a5a"
      />
      {/* Phobos & Deimos */}
      <group position={[-3.6, 0.45, 1.4]}>
        <mesh>
          <dodecahedronGeometry args={[0.12, 1]} />
          <meshStandardMaterial color="#b09986" roughness={0.9} />
        </mesh>
        <Html position={[0, 0.28, 0]} center zIndexRange={[4, 0]}>
          <span className="pointer-events-none rounded bg-space/80 px-1.5 py-0.5 font-mono text-[10px] text-muted">
            Phobos
          </span>
        </Html>
      </group>
      <group position={[4.5, -0.6, -2.1]}>
        <mesh>
          <dodecahedronGeometry args={[0.08, 1]} />
          <meshStandardMaterial color="#c2ab98" roughness={0.9} />
        </mesh>
        <Html position={[0, 0.24, 0]} center zIndexRange={[4, 0]}>
          <span className="pointer-events-none rounded bg-space/80 px-1.5 py-0.5 font-mono text-[10px] text-muted">
            Deimos
          </span>
        </Html>
      </group>

      <Line points={circlePoints(3.15, 0.28)} color="#fb923c" lineWidth={1.6} transparent opacity={0.7} />
      <group ref={orbitRef} rotation={[0.28, 0.4, 0]}>
        <InFlightSpacecraft
          design={design}
          spinRpm={spinRpm}
          downlinkActive={downlinkActive}
          reentryActive={reentryActive}
          reducedMotion={reducedMotion}
          scale={0.24}
          position={[3.15, 0, 0]}
        />
      </group>
    </group>
  );
}

/** 3D. Ch 4 Jupiter Destination View: Jupiter, Galilean moons, glowing radiation belt torus & bent flyby arc. */
function JupiterDestinationView({
  design,
  flybyRadii,
  downlinkActive,
  reducedMotion,
}: {
  design: Design;
  flybyRadii: number | null;
  downlinkActive: boolean;
  reducedMotion: boolean;
}) {
  const radii = flybyRadii ?? 5;
  const flybyCurve = useMemo(() => {
    const perijoveDist = radii === 2 ? 2.65 : radii === 5 ? 3.45 : 4.85;
    const bendZ = radii === 2 ? -4.8 : radii === 5 ? -2.6 : -0.9;
    const start = new Vector3(-6.5, -0.8, 3.8);
    const control = new Vector3(perijoveDist, 0.1, 0.4);
    const end = new Vector3(5.8, 0.9, bendZ);
    return new QuadraticBezierCurve3(start, control, end).getPoints(64);
  }, [radii]);

  return (
    <group name="destination_jupiter">
      <SimplePlanet texture={TEXTURES.jupiter} radius={2.25} spin={reducedMotion ? 0 : 0.045} />

      {/* Translucent glowing radiation-belt torus around Jupiter */}
      <mesh rotation={[Math.PI / 2, 0.08, 0]}>
        <torusGeometry args={[3.2, 0.68, 24, 72]} />
        <meshBasicMaterial
          color="#e879f9"
          transparent
          opacity={radii === 2 ? 0.34 : 0.22}
          blending={AdditiveBlending}
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>
      <Html position={[-3.3, 1.25, 0]} center zIndexRange={[4, 0]}>
        <div className="pointer-events-none whitespace-nowrap rounded-full border border-fuchsia-400/50 bg-space/90 px-2.5 py-0.5 font-mono text-[11px] text-fuchsia-300">
          Synchrotron Radiation Belts · Perijove {radii} R_J
        </div>
      </Html>

      {/* Galilean Moons */}
      {[
        { name: 'Io', pos: [3.8, 0.2, 1.8] as [number, number, number], color: '#facc15', r: 0.13 },
        { name: 'Europa', pos: [-4.4, -0.15, 2.2] as [number, number, number], color: '#bae6fd', r: 0.11 },
        { name: 'Ganymede', pos: [5.2, 0.3, -2.5] as [number, number, number], color: '#cbd5e1', r: 0.17 },
      ].map((m) => (
        <group key={m.name} position={m.pos}>
          <mesh>
            <sphereGeometry args={[m.r, 20, 20]} />
            <meshStandardMaterial color={m.color} roughness={0.7} />
          </mesh>
          <Html position={[0, m.r + 0.22, 0]} center zIndexRange={[4, 0]}>
            <span className="pointer-events-none rounded bg-space/80 px-1.5 py-0.5 font-mono text-[10px] text-ink/90">
              {m.name}
            </span>
          </Html>
        </group>
      ))}

      {/* Dynamic flyby trajectory arc */}
      <Line points={flybyCurve} color="#5ce1ff" lineWidth={2.4} />
      <InFlightSpacecraft
        design={design}
        spinRpm={0}
        downlinkActive={downlinkActive}
        reentryActive={false}
        reducedMotion={reducedMotion}
        scale={0.24}
        position={[flybyCurve[32].x, flybyCurve[32].y, flybyCurve[32].z]}
      />
    </group>
  );
}

/** 3E. Ch 5a Interstellar Probe Destination View: Heliosphere bubble, distant Sun star & Voyager 1 121 AU marker. */
function InterstellarDestinationView({
  design,
  sunDistanceAU,
  downlinkActive,
  reducedMotion,
}: {
  design: Design;
  sunDistanceAU: number;
  downlinkActive: boolean;
  reducedMotion: boolean;
}) {
  const ratio = Math.min(1.25, Math.max(0.15, sunDistanceAU / 120));
  const probeX = -3.2 + ratio * 5.8;

  return (
    <group name="destination_interstellar">
      {/* Distant Sun shrunk to a bright star */}
      <group position={[-3.2, 0, 0]}>
        <Glow size={1.6} inner="rgba(255,245,200,1)" outer="rgba(255,170,60,0)" />
        <Html position={[0, -0.55, 0]} center zIndexRange={[4, 0]}>
          <span className="pointer-events-none whitespace-nowrap rounded bg-space/85 px-2 py-0.5 font-mono text-[11px] text-amber-200">
            The Sun (14,400× fainter at 120 AU)
          </span>
        </Html>
      </group>

      {/* Heliosphere bubble */}
      <group position={[-1.2, 0, 0]}>
        <Heliosphere radius={3.6} opacity={0.48} />
      </group>

      {/* Voyager 1 crossing marker at 121 AU */}
      <group position={[2.45, 0.85, 0.4]}>
        <mesh>
          <sphereGeometry args={[0.09, 16, 16]} />
          <meshBasicMaterial color="#fbbf24" />
        </mesh>
        <Html position={[0, 0.35, 0]} center zIndexRange={[4, 0]}>
          <div className="pointer-events-none whitespace-nowrap rounded-full border border-amber-400/50 bg-space/90 px-2.5 py-0.5 font-mono text-[11px] text-amber-300">
            Voyager 1 crossed here (121 AU)
          </div>
        </Html>
      </group>

      <Line
        points={[
          [-3.2, 0, 0],
          [3.6, 0.2, 0],
        ]}
        color="#5ce1ff"
        lineWidth={2}
        dashed
        dashSize={0.25}
        gapSize={0.15}
      />

      <InFlightSpacecraft
        design={design}
        spinRpm={0}
        downlinkActive={downlinkActive}
        reentryActive={false}
        reducedMotion={reducedMotion}
        scale={0.26}
        position={[probeX, 0.15 * ratio, 0]}
      />
    </group>
  );
}

/** 3F-1. Ch 5b Exoplanet L2 Halo Orbit View: Space telescope at Sun–Earth L2 observing target stars. */
function ExoplanetL2View({
  design,
  downlinkActive,
  reducedMotion,
}: {
  design: Design;
  downlinkActive: boolean;
  reducedMotion: boolean;
}) {
  return (
    <group name="destination_exoplanet_l2">
      {/* Distant Earth + Moon behind the sunshield */}
      <SimplePlanet
        texture={TEXTURES.earthDay}
        radius={0.68}
        position={[-5.2, -0.6, -3.5]}
        spin={reducedMotion ? 0 : 0.04}
        atmosphere="#5aa8ff"
      />
      <SimplePlanet
        texture={TEXTURES.moon}
        radius={0.18}
        position={[-4.1, -0.2, -3.0]}
        spin={reducedMotion ? 0 : 0.02}
      />

      {/* L2 Halo Orbit Ring */}
      <Line points={circlePoints(2.2, 0.6)} color="#b48cff" lineWidth={1.8} dashed dashSize={0.25} gapSize={0.15} />
      <Html position={[0, -2.1, 0]} center zIndexRange={[4, 0]}>
        <div className="pointer-events-none whitespace-nowrap rounded-full border border-purple-400/50 bg-space/90 px-3 py-0.5 font-mono text-[11px] text-purple-200">
          Sun–Earth L2 Halo Orbit (1.5 million km from Earth)
        </div>
      </Html>

      {/* Telescope Sightline toward TRAPPIST-1 */}
      <Line
        points={[
          [0, 0.2, 0],
          [7.5, 1.8, -4.5],
        ]}
        color="#c084fc"
        lineWidth={1.5}
        dashed
        dashSize={0.3}
        gapSize={0.2}
      />
      <group position={[7.5, 1.8, -4.5]}>
        <Glow size={2.4} inner="rgba(255,160,120,1)" outer="rgba(255,60,30,0)" />
        <Html position={[0, 0.55, 0]} center zIndexRange={[4, 0]}>
          <span className="pointer-events-none whitespace-nowrap rounded bg-space/90 px-2 py-0.5 font-mono text-[11px] text-rose-200">
            TRAPPIST-1 (40 ly) & Proxima Centauri (4.24 ly)
          </span>
        </Html>
      </group>

      <InFlightSpacecraft
        design={design}
        spinRpm={0}
        downlinkActive={downlinkActive}
        reentryActive={false}
        reducedMotion={reducedMotion}
        scale={0.55}
        position={[0, 0.1, 0]}
      />
    </group>
  );
}

/** 3F-2. Ch 5b Detected Exoplanets 3D View: TRAPPIST-1 system (Artist's impression from measured size and orbit). */
function ExoplanetArtistImpressionView({ reducedMotion }: { reducedMotion: boolean }) {
  const systemRef = useRef<Group>(null);
  useFrame((_, delta) => {
    if (systemRef.current && !reducedMotion) {
      systemRef.current.rotation.y += delta * 0.14;
    }
  });

  const planets = [
    { name: 'b', r: 1.35, size: 0.11, color: '#d97706', hz: false },
    { name: 'c', r: 1.75, size: 0.105, color: '#ea580c', hz: false },
    { name: 'd', r: 2.15, size: 0.085, color: '#f59e0b', hz: false },
    { name: 'e (HZ)', r: 2.6, size: 0.095, color: '#38bdf8', hz: true },
    { name: 'f (HZ)', r: 3.1, size: 0.105, color: '#60a5fa', hz: true },
    { name: 'g (HZ)', r: 3.6, size: 0.115, color: '#93c5fd', hz: true },
    { name: 'h', r: 4.15, size: 0.078, color: '#cbd5e1', hz: false },
  ];

  return (
    <group name="destination_exoplanet_artist">
      {/* Ultra-cool red dwarf star TRAPPIST-1 (0.12 R_Sun) */}
      <mesh>
        <sphereGeometry args={[0.72, 36, 36]} />
        <meshBasicMaterial color="#ff5a36" />
      </mesh>
      <Glow size={3.6} inner="rgba(255,120,70,0.95)" outer="rgba(255,40,10,0)" />

      {/* Habitable zone annulus */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.35, 3.8, 64]} />
        <meshBasicMaterial color="#4cf0a0" transparent opacity={0.14} side={DoubleSide} />
      </mesh>

      {planets.map((p) => (
        <Line
          key={`orbit_${p.name}`}
          points={circlePoints(p.r)}
          color={p.hz ? '#4cf0a0' : '#fda4af'}
          lineWidth={p.hz ? 1.5 : 1}
          transparent
          opacity={p.hz ? 0.65 : 0.35}
        />
      ))}

      <group ref={systemRef}>
        {planets.map((p, idx) => {
          const angle = idx * 0.92;
          return (
            <group key={p.name} position={[Math.cos(angle) * p.r, 0, Math.sin(angle) * p.r]}>
              <mesh>
                <sphereGeometry args={[p.size, 24, 24]} />
                <meshStandardMaterial color={p.color} roughness={0.6} metalness={0.1} />
              </mesh>
              <Html position={[0, p.size + 0.2, 0]} center zIndexRange={[4, 0]}>
                <span
                  className={`pointer-events-none whitespace-nowrap rounded px-1.5 py-0.5 font-mono text-[10px] ${
                    p.hz ? 'border border-ok/50 bg-space/90 text-ok' : 'bg-space/80 text-ink/80'
                  }`}
                >
                  TRAPPIST-1{p.name}
                </span>
              </Html>
            </group>
          );
        })}
      </group>

      <Html position={[0, -2.55, 0]} center zIndexRange={[4, 0]}>
        <div className="pointer-events-none whitespace-nowrap rounded-xl border border-amber-300/50 bg-space/95 px-4 py-1.5 text-center font-mono text-xs text-amber-200 shadow-lg">
          Artist&apos;s impression from measured size and orbit (TRAPPIST-1 &amp; Proxima Centauri b)
        </div>
      </Html>
    </group>
  );
}

/**
 * Phase 07 3D scene rendered inside the persistent <Canvas> during JOURNEY and OPERATIONS.
 */
export function JourneyScene() {
  const camera = useThree((state) => state.camera);
  const mission = useGame((state) => state.mission);
  const design = useGame((state) => state.design);
  const journey = useGame((state) => state.journey);
  const flybyRadii = useGame((state) => state.flybyRadii);
  const reducedMotion = useGame((state) => state.settings.reducedMotion);
  const lowQuality = useGame((state) => state.settings.quality === 'low');
  const viewMode = useJourneyView((state) => state.viewMode);

  const pathwayId: PathwayId = mission?.pathwayId ?? 'leo';
  const trajectoryId = mission?.trajectoryId ?? '';
  const activeDesign = useMemo(() => design ?? emptyDesign(), [design]);
  const telemetry = useMemo(() => (journey ? liveTelemetry(journey) : null), [journey]);

  useLayoutEffect(() => {
    if (viewMode === 'system') {
      camera.position.set(0, 11.5, 16.5);
      camera.lookAt(0, 0, 0);
    } else if (viewMode === 'spacecraft') {
      camera.position.set(3.6, 2.2, 5.2);
      camera.lookAt(0, 0, 0);
    } else if (viewMode === 'exoplanet_artist') {
      camera.position.set(0, 4.4, 7.8);
      camera.lookAt(0, 0, 0);
    } else {
      camera.position.set(0, 2.2, 7.2);
      camera.lookAt(0, 0, 0);
    }
  }, [camera, viewMode, pathwayId]);

  const downlinkActive = (telemetry?.downlinkRateGbPerDay ?? 0) > 0;
  const reentryActive =
    Boolean(journey?.input.mission.pathway.crewed) &&
    ((telemetry?.segment === 'return' && (telemetry?.segmentProgress ?? 0) > 0.65) ||
      Boolean(journey?.checkpoints.some((c) => c.id === 'reentry')));

  const pendingEventId = journey?.pending?.eventId ?? null;
  const activeEventIds = useMemo(
    () => (journey ? journey.effects.filter((e) => e.untilDay > journey.day).map((e) => e.eventId) : []),
    [journey],
  );
  const pendingCatalogue = pendingEventId ? getEventCatalogueEntry(pendingEventId) : undefined;
  const visualCue = pendingCatalogue?.visualCue ?? null;

  const stormActive =
    visualCue === 'solar_storm' || activeEventIds.includes('solar_storm');
  const impactActive =
    visualCue === 'micrometeoroid' || pendingEventId === 'wheel_failure';
  const commsCutActive =
    visualCue === 'comms_cut' ||
    activeEventIds.includes('ground_outage') ||
    activeEventIds.includes('conjunction');
  const alarmActive =
    Boolean(journey?.pending && visualCue !== 'celebration') || Boolean(telemetry?.survivalMode);

  return (
    <>
      <SceneBackground />
      <Starfield count={lowQuality ? 1200 : 2400} milkyWay={0.35} seed={19} />
      <SunLight direction={SUN_DIRECTION} />
      <ambientLight intensity={0.22} />

      <AlarmLight active={alarmActive} reducedMotion={reducedMotion} />
      <StormParticles active={stormActive} reducedMotion={reducedMotion} count={lowQuality ? 90 : 180} />
      <ImpactBurst active={impactActive} reducedMotion={reducedMotion} />
      {commsCutActive && viewMode !== 'system' && (
        <group name="event_comms_cut">
          <Line
            points={[
              [0, 1.1, 0],
              [-4.5, 2.4, -3],
            ]}
            color="#ff5c7a"
            lineWidth={1.8}
            dashed
            dashSize={0.25}
            gapSize={0.45}
            transparent
            opacity={0.85}
          />
          <Html position={[-2.2, 1.9, -1.5]} center zIndexRange={[4, 0]}>
            <div className="pointer-events-none whitespace-nowrap rounded-full border border-bad/70 bg-space/90 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase text-bad">
              ✕ Comms Link Severed
            </div>
          </Html>
        </group>
      )}

      {viewMode === 'system' && (
        <SystemMapView
          pathwayId={pathwayId}
          progress={telemetry?.progress ?? 0}
          segment={telemetry?.segment ?? 'cruise'}
          sunDistanceAU={telemetry?.sunDistanceAU ?? 1}
          day={journey?.day ?? 0}
          flybyRadii={flybyRadii}
          reducedMotion={reducedMotion}
        />
      )}

      {viewMode === 'spacecraft' && (
        <SpacecraftCloseupView
          design={activeDesign}
          spinRpm={telemetry?.spinRpm ?? 0}
          downlinkActive={downlinkActive}
          reentryActive={reentryActive}
          reducedMotion={reducedMotion}
        />
      )}

      {viewMode === 'exoplanet_artist' && <ExoplanetArtistImpressionView reducedMotion={reducedMotion} />}

      {viewMode === 'destination' && (
        <>
          {pathwayId === 'leo' && (
            <LeoDestinationView
              design={activeDesign}
              downlinkActive={downlinkActive}
              reentryActive={reentryActive}
              reducedMotion={reducedMotion}
              lowQuality={lowQuality}
            />
          )}
          {pathwayId === 'moon' && (
            <MoonDestinationView
              design={activeDesign}
              trajectoryId={trajectoryId}
              downlinkActive={downlinkActive}
              reentryActive={reentryActive}
              reducedMotion={reducedMotion}
            />
          )}
          {pathwayId === 'mars' && (
            <MarsDestinationView
              design={activeDesign}
              spinRpm={telemetry?.spinRpm ?? 0}
              downlinkActive={downlinkActive}
              reentryActive={reentryActive}
              reducedMotion={reducedMotion}
            />
          )}
          {pathwayId === 'jupiter' && (
            <JupiterDestinationView
              design={activeDesign}
              flybyRadii={flybyRadii}
              downlinkActive={downlinkActive}
              reducedMotion={reducedMotion}
            />
          )}
          {pathwayId === 'interstellar' && (
            <InterstellarDestinationView
              design={activeDesign}
              sunDistanceAU={telemetry?.sunDistanceAU ?? 120}
              downlinkActive={downlinkActive}
              reducedMotion={reducedMotion}
            />
          )}
          {pathwayId === 'exoplanet' && (
            <ExoplanetL2View
              design={activeDesign}
              downlinkActive={downlinkActive}
              reducedMotion={reducedMotion}
            />
          )}
        </>
      )}

      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        minDistance={3}
        maxDistance={28}
      />
    </>
  );
}
