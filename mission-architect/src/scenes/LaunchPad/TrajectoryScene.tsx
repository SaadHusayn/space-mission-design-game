'use client';

import { Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { AdditiveBlending, type Group } from 'three';

import { getPathway } from '@/game';
import type { PathwayId } from '@/game/types';
import { useGame } from '@/hooks/useGame';
import { Engineer } from '@/sets/Figures';
import { HangarSet } from '@/sets/HangarSet';
import { TEXTURES } from '@/three/constants';
import { Heliosphere } from '@/three/Heliosphere';
import { SimplePlanet } from '@/three/SimplePlanet';
import { Glow } from '@/three/Sun';

type Vec3 = [number, number, number];

function ellipseArc(
  rx: number,
  rz: number,
  yOffset = 0,
  tiltZ = 0,
  startAngle = 0,
  endAngle = Math.PI * 2,
  segments = 72,
  centerX = 0,
): Vec3[] {
  const pts: Vec3[] = [];
  for (let i = 0; i <= segments; i++) {
    const a = startAngle + ((endAngle - startAngle) * i) / segments;
    const x = centerX + Math.cos(a) * rx;
    const z = Math.sin(a) * rz;
    const y = yOffset + x * Math.sin(tiltZ);
    pts.push([x, y, z]);
  }
  return pts;
}

/** Builds 3D holographic transfer curves for each trajectory option in a pathway. */
function buildTrajectoryCurves(pathwayId: PathwayId): Record<string, Vec3[]> {
  switch (pathwayId) {
    case 'leo':
      return {
        leo_400: ellipseArc(0.92, 0.92, 0, 0.28),
        leo_550: ellipseArc(1.14, 1.14, 0, -0.34),
      };
    case 'moon':
      return {
        moon_orbit: ellipseArc(0.95, 0.78, 0.04, 0.22, 0, Math.PI * 2, 72, 0.18),
        moon_free_return: [
          ...ellipseArc(1.08, 0.62, 0.02, -0.18, 0, Math.PI, 40, 0.22),
          ...ellipseArc(1.08, 0.62, -0.02, 0.18, Math.PI, Math.PI * 2, 40, 0.22),
        ],
      };
    case 'mars':
      return {
        mars_hohmann: ellipseArc(1.05, 0.92, 0.02, 0.12, 0, Math.PI * 2, 80, -0.18),
        mars_fast: ellipseArc(1.22, 0.74, 0.08, 0.26, 0, Math.PI * 2, 80, -0.25),
      };
    case 'jupiter':
      return {
        jupiter_direct: ellipseArc(1.18, 0.95, 0.02, 0.1, 0, Math.PI * 1.35, 64, -0.2),
        jupiter_ega: [
          ...ellipseArc(0.55, 0.52, 0, 0.08, 0, Math.PI * 1.6, 40, 0),
          ...ellipseArc(1.25, 1.02, 0.05, 0.16, Math.PI * 0.2, Math.PI * 1.45, 50, -0.18),
        ],
      };
    case 'interstellar':
      return {
        interstellar_jupiter: [
          [-0.55, 0, 0.25],
          [-0.2, 0.04, 0.42],
          [0.18, 0.08, 0.28],
          [0.65, 0.15, -0.15],
          [1.28, 0.24, -0.62],
        ],
        interstellar_direct: [
          [-0.55, 0, 0.25],
          [-0.1, -0.04, 0.05],
          [0.45, -0.08, -0.22],
          [1.22, -0.14, -0.58],
        ],
      };
    case 'exoplanet':
      return {
        exo_direct: [
          [-0.65, 0, 0],
          [-0.15, 0.12, 0.24],
          [0.45, 0.16, 0.18],
          ...ellipseArc(0.28, 0.36, 0.16, 0.35, 0, Math.PI * 2, 48, 0.72),
        ],
        exo_lunar: [
          [-0.65, 0, 0],
          [-0.22, -0.08, -0.35],
          [0.12, 0.05, -0.12],
          [0.48, 0.14, 0.12],
          ...ellipseArc(0.28, 0.36, 0.16, 0.35, 0, Math.PI * 2, 48, 0.72),
        ],
      };
  }
}

function TrajectoryHologram({
  pathwayId,
  selectedTrajectoryId,
  reducedMotion,
  onSelectTrajectory,
}: {
  pathwayId: PathwayId;
  selectedTrajectoryId: string;
  reducedMotion: boolean;
  onSelectTrajectory: (id: string) => void;
}) {
  const pathway = useMemo(() => getPathway(pathwayId), [pathwayId]);
  const curves = useMemo(() => buildTrajectoryCurves(pathwayId), [pathwayId]);
  const markerRef = useRef<Group>(null);
  const tRef = useRef(0);

  const activePoints = curves[selectedTrajectoryId] ?? Object.values(curves)[0] ?? [];

  useFrame((_, delta) => {
    if (!markerRef.current || activePoints.length < 2) return;
    if (!reducedMotion) {
      tRef.current = (tRef.current + delta * 0.28) % 1;
    }
    const idxFloat = tRef.current * (activePoints.length - 1);
    const idx = Math.floor(idxFloat);
    const frac = idxFloat - idx;
    const p0 = activePoints[idx] ?? activePoints[0];
    const p1 = activePoints[Math.min(activePoints.length - 1, idx + 1)] ?? p0;
    markerRef.current.position.set(
      p0[0] + (p1[0] - p0[0]) * frac,
      p0[1] + (p1[1] - p0[1]) * frac,
      p0[2] + (p1[2] - p0[2]) * frac,
    );
  });

  return (
    <group position={[0, 2.55, 0]}>
      {/* Central reference bodies per pathway */}
      {pathwayId === 'leo' && (
        <SimplePlanet texture={TEXTURES.earthDay} radius={0.58} spin={reducedMotion ? 0 : 0.18} atmosphere="#5aa8ff" />
      )}
      {pathwayId === 'moon' && (
        <group>
          <group position={[-0.45, 0, 0]}>
            <SimplePlanet texture={TEXTURES.earthDay} radius={0.36} spin={reducedMotion ? 0 : 0.15} atmosphere="#5aa8ff" />
          </group>
          <group position={[0.72, 0.04, 0]}>
            <SimplePlanet texture={TEXTURES.moon} radius={0.18} spin={reducedMotion ? 0 : 0.08} />
          </group>
        </group>
      )}
      {pathwayId === 'mars' && (
        <group>
          <Glow size={0.55} />
          <group position={[-0.65, 0, 0.25]}>
            <SimplePlanet texture={TEXTURES.earthDay} radius={0.16} spin={0.12} atmosphere="#5aa8ff" />
          </group>
          <group position={[0.78, 0.06, -0.18]}>
            <SimplePlanet texture={TEXTURES.mars} radius={0.18} spin={0.12} atmosphere="#ff9a6a" />
          </group>
        </group>
      )}
      {pathwayId === 'jupiter' && (
        <group>
          <Glow size={0.5} />
          <group position={[-0.42, 0, 0.28]}>
            <SimplePlanet texture={TEXTURES.earthDay} radius={0.14} spin={0.12} atmosphere="#5aa8ff" />
          </group>
          <group position={[0.85, 0.06, -0.25]}>
            <SimplePlanet texture={TEXTURES.jupiter} radius={0.32} spin={0.22} />
          </group>
        </group>
      )}
      {pathwayId === 'interstellar' && (
        <group>
          <group position={[-0.55, 0, 0.25]}>
            <Glow size={0.55} />
          </group>
          <group position={[0.18, 0.08, 0.28]}>
            <SimplePlanet texture={TEXTURES.jupiter} radius={0.16} spin={0.2} />
          </group>
          <Heliosphere radius={1.05} opacity={0.75} />
        </group>
      )}
      {pathwayId === 'exoplanet' && (
        <group>
          <group position={[-0.65, 0, 0]}>
            <SimplePlanet texture={TEXTURES.earthDay} radius={0.3} spin={0.14} atmosphere="#5aa8ff" />
          </group>
          <group position={[-0.2, -0.06, -0.32]}>
            <SimplePlanet texture={TEXTURES.moon} radius={0.11} spin={0.08} />
          </group>
          {/* L2 Halo point marker */}
          <mesh position={[0.72, 0.16, 0]}>
            <octahedronGeometry args={[0.07, 0]} />
            <meshBasicMaterial color="#b48cff" toneMapped={false} />
          </mesh>
        </group>
      )}

      {/* Trajectory option curves */}
      {pathway.trajectories.map((option, idx) => {
        const pts = curves[option.id];
        if (!pts || pts.length < 2) return null;
        const selected = option.id === selectedTrajectoryId;
        const color = selected ? (idx === 0 ? '#5ce1ff' : '#ffb547') : '#6e84a3';
        return (
          <group
            key={option.id}
            onClick={(e) => {
              e.stopPropagation();
              onSelectTrajectory(option.id);
            }}
          >
            <Line
              points={pts}
              color={color}
              lineWidth={selected ? 3.2 : 1.5}
              transparent
              opacity={selected ? 0.98 : 0.38}
              dashed={!selected}
              dashSize={0.08}
              gapSize={0.05}
            />
          </group>
        );
      })}

      {/* Animated spacecraft marker along the active trajectory */}
      <group ref={markerRef}>
        <mesh>
          <sphereGeometry args={[0.055, 16, 16]} />
          <meshBasicMaterial color="#4cf0a0" toneMapped={false} />
        </mesh>
        <mesh>
          <ringGeometry args={[0.075, 0.11, 24]} />
          <meshBasicMaterial color="#5ce1ff" side={2} toneMapped={false} transparent opacity={0.85} />
        </mesh>
      </group>

      <pointLight position={[1.5, 1.2, 1.5]} intensity={4} color="#5ce1ff" distance={8} />
    </group>
  );
}

/**
 * TRAJECTORY phase 3D scene: Holographic orbital planning table in Mission Control.
 */
export function TrajectoryScene() {
  const mission = useGame((state) => state.mission);
  const reducedMotion = useGame((state) => state.settings.reducedMotion);
  const selectTrajectory = useGame((state) => state.selectTrajectory);
  const angleRef = useRef(0.45);

  const pathwayId: PathwayId = mission?.pathwayId ?? 'leo';
  const pathway = useMemo(() => getPathway(pathwayId), [pathwayId]);
  const selectedTrajectoryId = mission?.trajectoryId ?? pathway.trajectories[0]?.id ?? '';

  useFrame((state, delta) => {
    if (!reducedMotion) {
      angleRef.current += delta * 0.045;
    }
    const camX = Math.cos(angleRef.current) * 5.2 - 0.6;
    const camZ = Math.sin(angleRef.current) * 5.2 + 1.2;
    state.camera.position.set(camX, 3.35, camZ);
    state.camera.lookAt(0.4, 2.35, 0);
  });

  return (
    <HangarSet brightness={0.58} holoTable={false}>
      <group>
        <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[1.6, 1.8, 1, 64]} />
          <meshStandardMaterial color="#1a2233" metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh position={[0, 1.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.3, 1.5, 96]} />
          <meshStandardMaterial color="#5ce1ff" emissive="#5ce1ff" emissiveIntensity={2} toneMapped={false} />
        </mesh>
        <mesh position={[0, 1.8, 0]}>
          <cylinderGeometry args={[1.2, 1.3, 1.6, 48, 1, true]} />
          <meshBasicMaterial
            color="#5ce1ff"
            transparent
            opacity={0.07}
            blending={AdditiveBlending}
            depthWrite={false}
            side={2}
          />
        </mesh>
        <TrajectoryHologram
          pathwayId={pathwayId}
          selectedTrajectoryId={selectedTrajectoryId}
          reducedMotion={reducedMotion}
          onSelectTrajectory={selectTrajectory}
        />
      </group>
      <Engineer position={[-1.7, 0, 0.3]} rotation={[0, 1.2, 0]} colour="#2b3445" accent="#e8f1ff" />
      <Engineer position={[1.9, 0, -0.6]} rotation={[0, -1.8, 0]} colour="#e9edf3" accent="#ffb547" />
      <Engineer position={[1.2, 0, 1.8]} rotation={[0, -2.6, 0]} colour="#e9edf3" accent="#b48cff" />
    </HangarSet>
  );
}
