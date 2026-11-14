'use client';

import type { ThreeEvent } from '@react-three/fiber';
import { AdditiveBlending, DoubleSide } from 'three';

import { vehicleHeightM } from '@/game';
import type { Design, LaunchVehicle } from '@/game/types';

import { Spacecraft } from './Spacecraft';

export interface RocketModelProps {
  vehicle: LaunchVehicle;
  position?: [number, number, number];
  selected?: boolean;
  compatible?: boolean;
  onSelect?: (vehicleId: string) => void;
  /** True when Stage 1 engines are firing. */
  stage1Firing?: boolean;
  /** True when Stage 2 engine is firing. */
  stage2Firing?: boolean;
  /** Throttle factor [0.5 .. 1.2] scaling the exhaust plume. */
  throttle?: number;
  /** Seconds since Stage 1 separation (0 = attached). */
  stage1SepElapsedS?: number;
  /** Seconds since Fairing separation (0 = attached). */
  fairingSepElapsedS?: number;
  /** Optional player spacecraft design rendered inside the payload fairing. */
  design?: Design | null;
}

/**
 * Procedural 3D launch vehicle with separable Stage 1, Stage 2, split payload fairing,
 * side boosters (for Heavy/Super-Heavy), and engine exhaust plumes.
 */
export function RocketModel({
  vehicle,
  position = [0, 0, 0],
  selected = false,
  compatible = true,
  onSelect,
  stage1Firing = false,
  stage2Firing = false,
  throttle = 1.0,
  stage1SepElapsedS = 0,
  fairingSepElapsedS = 0,
  design = null,
}: RocketModelProps) {
  // 0.25 scene units per metre: 24m -> 6u, 48m -> 12u, 64m -> 16u, 92m -> 23u
  const totalH = vehicleHeightM(vehicle.id) * 0.25;
  const radius =
    vehicle.id === 'lv_superheavy'
      ? 1.15
      : vehicle.id === 'lv_heavy'
        ? 0.92
        : vehicle.id === 'lv_medium'
          ? 0.76
          : 0.52;

  const s1H = totalH * 0.58;
  const s2H = totalH * 0.22;
  const fairingH = totalH * 0.2;

  const hasSideBoosters = vehicle.id === 'lv_heavy' || vehicle.id === 'lv_superheavy';
  const boosterRadius = radius * 0.62;
  const boosterH = s1H * 0.86;

  // Stage 1 separation offset (drops down and pitches slightly away)
  const s1DropY = stage1SepElapsedS > 0 ? -Math.min(45, stage1SepElapsedS * stage1SepElapsedS * 2.4 + stage1SepElapsedS * 3.5) : 0;
  const s1TiltZ = stage1SepElapsedS > 0 ? Math.min(0.45, stage1SepElapsedS * 0.08) : 0;

  // Fairing separation offset (splits outward in X and falls back in Y)
  const fairingOutX = fairingSepElapsedS > 0 ? Math.min(18, fairingSepElapsedS * 2.8) : 0;
  const fairingDropY = fairingSepElapsedS > 0 ? -Math.min(25, fairingSepElapsedS * fairingSepElapsedS * 1.6) : 0;
  const fairingRotZ = fairingSepElapsedS > 0 ? Math.min(1.1, fairingSepElapsedS * 0.28) : 0;

  const accentColor = selected ? '#5ce1ff' : compatible ? '#4cf0a0' : '#ff5a6a';
  const bodyColor = vehicle.id === 'lv_superheavy' ? '#d4dce8' : '#eef2f8';

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (!onSelect) return;
    e.stopPropagation();
    onSelect(vehicle.id);
  };

  return (
    <group
      name={`rocket_${vehicle.id}`}
      position={position}
      onClick={handleClick}
      onPointerOver={(e) => {
        if (!onSelect) return;
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        if (!onSelect) return;
        document.body.style.cursor = 'auto';
      }}
    >
      {/* Selection ring on pad when used in RocketLineupScene */}
      {onSelect && (
        <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radius * (hasSideBoosters ? 2.6 : 1.7), radius * (hasSideBoosters ? 2.95 : 2.0), 48]} />
          <meshBasicMaterial color={accentColor} toneMapped={false} transparent opacity={selected ? 0.95 : 0.45} side={DoubleSide} />
        </mesh>
      )}

      {/* STAGE 1 (Drops away after MECO / Stage Sep) */}
      <group name="part_stage1" position={[0, s1DropY, 0]} rotation={[0, 0, s1TiltZ]}>
        {/* Core Stage 1 tank */}
        <mesh position={[0, s1H / 2 + 0.3, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[radius, radius, s1H, 32]} />
          <meshStandardMaterial
            color={bodyColor}
            metalness={vehicle.id === 'lv_superheavy' ? 0.65 : 0.25}
            roughness={0.4}
            emissive={selected ? '#5ce1ff' : '#000000'}
            emissiveIntensity={selected ? 0.12 : 0}
          />
        </mesh>

        {/* Dark interstage & roll-pattern bands */}
        <mesh position={[0, s1H * 0.22 + 0.3, 0]}>
          <cylinderGeometry args={[radius * 1.015, radius * 1.015, s1H * 0.08, 32]} />
          <meshStandardMaterial color="#182030" roughness={0.6} />
        </mesh>
        <mesh position={[0, s1H + 0.15, 0]}>
          <cylinderGeometry args={[radius * 1.01, radius * 1.01, 0.45, 32]} />
          <meshStandardMaterial color="#1e293b" metalness={0.5} roughness={0.5} />
        </mesh>

        {/* Core engine bell cluster */}
        <mesh position={[0, 0.15, 0]}>
          <cylinderGeometry args={[radius * 0.55, radius * 0.82, 0.45, 24]} />
          <meshStandardMaterial color="#1f2430" metalness={0.8} roughness={0.35} />
        </mesh>

        {/* Side boosters for Heavy & Super-Heavy */}
        {hasSideBoosters &&
          ([-1, 1] as const).map((side) => {
            const bx = side * (radius + boosterRadius + 0.08);
            return (
              <group key={side} position={[bx, 0.3, 0]}>
                <mesh position={[0, boosterH / 2, 0]} castShadow>
                  <cylinderGeometry args={[boosterRadius, boosterRadius, boosterH, 24]} />
                  <meshStandardMaterial color="#e8edf5" metalness={0.28} roughness={0.42} />
                </mesh>
                <mesh position={[0, boosterH + boosterRadius * 0.9, 0]} castShadow>
                  <coneGeometry args={[boosterRadius, boosterRadius * 1.8, 24]} />
                  <meshStandardMaterial color="#f8fafc" roughness={0.38} />
                </mesh>
                <mesh position={[0, -0.12, 0]}>
                  <cylinderGeometry args={[boosterRadius * 0.5, boosterRadius * 0.78, 0.35, 20]} />
                  <meshStandardMaterial color="#1f2430" metalness={0.8} roughness={0.35} />
                </mesh>
              </group>
            );
          })}

        {/* Stage 1 Exhaust Plume */}
        {stage1Firing && (
          <group position={[0, -0.1, 0]} scale={[1, Math.max(0.45, throttle), 1]}>
            <mesh position={[0, -2.4, 0]} rotation={[Math.PI, 0, 0]}>
              <coneGeometry args={[radius * (hasSideBoosters ? 2.1 : 1.25), 5.2, 24, 1, true]} />
              <meshBasicMaterial
                color="#ffb547"
                transparent
                opacity={0.78}
                blending={AdditiveBlending}
                depthWrite={false}
                side={DoubleSide}
                toneMapped={false}
              />
            </mesh>
            <mesh position={[0, -1.3, 0]} rotation={[Math.PI, 0, 0]}>
              <coneGeometry args={[radius * (hasSideBoosters ? 1.2 : 0.72), 2.8, 20]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.92} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
            </mesh>
            <pointLight position={[0, -1.8, 0]} color="#ff9d2e" intensity={18 * throttle} distance={32} />
          </group>
        )}
      </group>

      {/* STAGE 2 + PAYLOAD FAIRING */}
      <group name="part_stage2" position={[0, s1H + 0.3, 0]}>
        {/* Stage 2 tank */}
        <mesh position={[0, s2H / 2, 0]} castShadow>
          <cylinderGeometry args={[radius * 0.94, radius * 0.98, s2H, 32]} />
          <meshStandardMaterial color={bodyColor} metalness={0.28} roughness={0.42} />
        </mesh>

        {/* Accent telemetry ring */}
        <mesh position={[0, 0.15, 0]}>
          <cylinderGeometry args={[radius * 0.99, radius * 0.99, 0.18, 32]} />
          <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={0.85} toneMapped={false} />
        </mesh>

        {/* Stage 2 vacuum nozzle (visible after Stage 1 separation) */}
        <mesh position={[0, -0.25, 0]}>
          <cylinderGeometry args={[radius * 0.32, radius * 0.62, 0.55, 24]} />
          <meshStandardMaterial color="#334155" metalness={0.85} roughness={0.3} />
        </mesh>

        {/* Stage 2 Vacuum Exhaust Plume */}
        {stage2Firing && (
          <group position={[0, -0.5, 0]}>
            <mesh position={[0, -1.9, 0]} rotation={[Math.PI, 0, 0]}>
              <coneGeometry args={[radius * 1.35, 3.8, 24, 1, true]} />
              <meshBasicMaterial
                color="#5ce1ff"
                transparent
                opacity={0.68}
                blending={AdditiveBlending}
                depthWrite={false}
                side={DoubleSide}
                toneMapped={false}
              />
            </mesh>
            <mesh position={[0, -1.0, 0]} rotation={[Math.PI, 0, 0]}>
              <coneGeometry args={[radius * 0.55, 2.0, 20]} />
              <meshBasicMaterial color="#e8f1ff" transparent opacity={0.9} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
            </mesh>
            <pointLight position={[0, -1.2, 0]} color="#5ce1ff" intensity={10} distance={20} />
          </group>
        )}

        {/* Spacecraft mounted on payload adapter inside fairing */}
        {design && (
          <group position={[0, s2H + fairingH * 0.36, 0]} scale={Math.min(0.45, radius * 0.42)}>
            <Spacecraft
              design={design}
              selectedTarget="bus"
              hoveredTarget={null}
              position={[0, 0, 0]}
            />
          </group>
        )}

        {/* Clam-shell Payload Fairing Halves (Left & Right) */}
        {([-1, 1] as const).map((side) => {
          const thetaStart = side < 0 ? Math.PI : 0;
          const xOffset = side * fairingOutX;
          const zRot = -side * fairingRotZ;
          return (
            <group
              key={side}
              name={side < 0 ? 'part_fairing_left' : 'part_fairing_right'}
              position={[xOffset, s2H + fairingDropY, 0]}
              rotation={[0, 0, zRot]}
            >
              {/* Cylindrical lower fairing half */}
              <mesh position={[0, fairingH * 0.28, 0]} castShadow>
                <cylinderGeometry args={[radius * 0.96, radius * 0.94, fairingH * 0.56, 24, 1, false, thetaStart, Math.PI]} />
                <meshStandardMaterial color="#f8fafc" roughness={0.38} metalness={0.18} side={DoubleSide} />
              </mesh>
              {/* Ogive nose cone half */}
              <mesh position={[0, fairingH * 0.78, 0]} castShadow>
                <coneGeometry args={[radius * 0.96, fairingH * 0.44, 24, 1, false, thetaStart, Math.PI]} />
                <meshStandardMaterial color="#f8fafc" roughness={0.38} metalness={0.18} side={DoubleSide} />
              </mesh>
            </group>
          );
        })}
      </group>
    </group>
  );
}
