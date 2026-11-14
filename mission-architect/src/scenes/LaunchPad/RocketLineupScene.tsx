'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { Vector3 } from 'three';

import { createMission, gameData, reviewDesign, vehicleHeightM } from '@/game';
import { useGame } from '@/hooks/useGame';
import { RocketModel } from '@/three/RocketModel';
import { SceneBackground } from '@/three/SceneBackground';
import { Starfield } from '@/three/Starfield';

const ROCKET_X_POSITIONS: Readonly<Record<string, number>> = {
  lv_light: -12,
  lv_medium: -4.2,
  lv_heavy: 4.2,
  lv_superheavy: 13.5,
};

function ServiceTower({ x, height }: { x: number; height: number }) {
  const levels = Math.max(4, Math.floor(height / 2.1));
  return (
    <group position={[x - 2.6, 0.4, -1.6]}>
      {[-0.55, 0.55].map((lx) =>
        [-0.55, 0.55].map((lz) => (
          <mesh key={`${lx}${lz}`} position={[lx, height / 2, lz]} castShadow>
            <boxGeometry args={[0.14, height, 0.14]} />
            <meshStandardMaterial color="#8a5a2b" roughness={0.72} />
          </mesh>
        )),
      )}
      {Array.from({ length: levels }).map((_, i) => (
        <mesh key={i} position={[0, i * 2.1 + 0.8, 0]}>
          <boxGeometry args={[1.3, 0.1, 1.3]} />
          <meshStandardMaterial color="#8a5a2b" roughness={0.72} />
        </mesh>
      ))}
      <mesh position={[0, height + 0.25, 0]}>
        <sphereGeometry args={[0.15, 10, 10]} />
        <meshBasicMaterial color="#ff4d4d" toneMapped={false} />
      </mesh>
    </group>
  );
}

/**
 * 3D Launch Vehicle Lineup scene (`LAUNCH_VEHICLE` and `GO_NO_GO` phases).
 * Displays all 4 rockets (`lv_light`, `lv_medium`, `lv_heavy`, `lv_superheavy`) standing
 * at their true relative heights (`24 m`, `48 m`, `64 m`, `92 m`) on the launch pad.
 */
export function RocketLineupScene() {
  const phase = useGame((state) => state.phase);
  const missionState = useGame((state) => state.mission);
  const design = useGame((state) => state.design);
  const vehicleId = useGame((state) => state.vehicleId);
  const difficulty = useGame((state) => state.profile.difficulty);
  const reducedMotion = useGame((state) => state.settings.reducedMotion);
  const lowQuality = useGame((state) => state.settings.quality === 'low');
  const selectLaunchVehicle = useGame((state) => state.selectLaunchVehicle);

  const camPos = useRef(new Vector3(0, 9.5, 34));
  const camLook = useRef(new Vector3(0, 8.5, 0));

  const compatibilityByVehicle = useMemo(() => {
    const map = new Map<string, boolean>();
    if (!missionState || !design) return map;
    const context = createMission(missionState.pathwayId, missionState.trajectoryId ?? undefined, difficulty);
    for (const vehicle of gameData.launchVehicles) {
      const review = reviewDesign(design, context, vehicle);
      map.set(vehicle.id, review.go);
    }
    return map;
  }, [missionState, design, difficulty]);

  useFrame((state, delta) => {
    const selectedX = vehicleId ? (ROCKET_X_POSITIONS[vehicleId] ?? 0) : 0;
    const selectedVehicle = vehicleId ? gameData.launchVehicleById.get(vehicleId) : null;
    const selectedH = selectedVehicle ? vehicleHeightM(selectedVehicle.id) * 0.25 : 14;

    const isGoNoGo = phase === 'GO_NO_GO';
    const targetPos = new Vector3(
      vehicleId ? selectedX * 0.55 : 0,
      isGoNoGo ? selectedH * 0.58 : 10.5,
      isGoNoGo ? 24 : vehicleId ? 31 : 36,
    );
    const targetLook = new Vector3(
      vehicleId ? selectedX * 0.65 : 0.5,
      isGoNoGo ? selectedH * 0.5 : 8.5,
      0,
    );

    if (reducedMotion) {
      camPos.current.copy(targetPos);
      camLook.current.copy(targetLook);
    } else {
      const step = Math.min(1, delta * 3.5);
      camPos.current.lerp(targetPos, step);
      camLook.current.lerp(targetLook, step);
    }

    state.camera.position.copy(camPos.current);
    state.camera.lookAt(camLook.current);
  });

  return (
    <group>
      <SceneBackground color="#030711" fog={[38, 120]} />
      <Starfield count={lowQuality ? 1000 : 1800} milkyWay={0.55} seed={6} />
      <hemisphereLight args={['#6e92cc', '#0a0e17', 0.45]} />
      <directionalLight position={[18, 28, 22]} intensity={1.8} color="#fff4e0" castShadow={!lowQuality} />

      {/* Ground tarmac and blast apron */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[95, 64]} />
        <meshStandardMaterial color="#0b1018" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.2, 0]} receiveShadow>
        <boxGeometry args={[38, 0.4, 12]} />
        <meshStandardMaterial color="#272f3b" roughness={0.88} />
      </mesh>

      {/* Four launch vehicles standing side by side at relative heights */}
      {gameData.launchVehicles.map((vehicle) => {
        const x = ROCKET_X_POSITIONS[vehicle.id] ?? 0;
        const selected = vehicleId === vehicle.id;
        const compatible = compatibilityByVehicle.get(vehicle.id) ?? true;
        const h = vehicleHeightM(vehicle.id) * 0.25;
        return (
          <group key={vehicle.id}>
            {/* Individual concrete flame trench pad */}
            <mesh position={[x, 0.45, 0]} receiveShadow castShadow>
              <cylinderGeometry args={[2.5, 3.1, 0.5, 8]} />
              <meshStandardMaterial color={selected ? '#38465a' : '#2f3642'} roughness={0.85} />
            </mesh>
            <ServiceTower x={x} height={h * 0.92} />
            <RocketModel
              vehicle={vehicle}
              position={[x, 0.7, 0]}
              selected={selected}
              compatible={compatible}
              onSelect={phase === 'LAUNCH_VEHICLE' ? selectLaunchVehicle : undefined}
              design={selected ? design : null}
            />
          </group>
        );
      })}

      {/* Pad floodlights */}
      {[
        [-16, 2.5, 14],
        [0, 2.5, 16],
        [16, 2.5, 14],
      ].map((pos) => (
        <group key={pos.join()}>
          <pointLight position={pos as [number, number, number]} intensity={48} distance={50} color="#fff1d6" />
          <mesh position={pos as [number, number, number]}>
            <sphereGeometry args={[0.3, 10, 10]} />
            <meshBasicMaterial color="#fff1d6" toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
