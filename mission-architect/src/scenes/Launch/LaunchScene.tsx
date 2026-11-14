'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { AdditiveBlending, DoubleSide, type Group, Vector3 } from 'three';

import { CutsceneDirector } from '@/cutscenes/CutsceneDirector';
import { rolloutScript } from '@/cutscenes/rollout';
import { createMission, getLaunchVehicle, summarizeDesign, vehicleHeightM } from '@/game';
import { useGame } from '@/hooks/useGame';
import { TEXTURES } from '@/three/constants';
import { RocketModel } from '@/three/RocketModel';
import { SceneBackground } from '@/three/SceneBackground';
import { SimplePlanet } from '@/three/SimplePlanet';
import { Starfield } from '@/three/Starfield';

import { launchStore, useLaunch } from './launchStore';

/** ROLLOUT phase 3D cutscene component: plays CS-04 and transitions to LAUNCH on completion/skip. */
export function RolloutCutscene() {
  const missionState = useGame((state) => state.mission);
  const vehicleId = useGame((state) => state.vehicleId);
  const difficulty = useGame((state) => state.profile.difficulty);
  const startLaunch = useGame((state) => state.startLaunch);

  const script = useMemo(() => {
    if (!missionState) return null;
    const mission = createMission(missionState.pathwayId, missionState.trajectoryId ?? undefined, difficulty);
    const vehicle = getLaunchVehicle(vehicleId ?? 'lv_medium');
    return rolloutScript(mission, vehicle);
  }, [missionState, vehicleId, difficulty]);

  if (!script) return null;
  return <CutsceneDirector script={script} onComplete={startLaunch} />;
}

const SMOKE_PUFFS = [
  [-2.6, 0.5, 1.2, 1.4],
  [2.8, 0.55, -1.1, 1.5],
  [-1.9, 0.45, -2.3, 1.2],
  [2.1, 0.5, 2.2, 1.35],
  [-3.8, 0.65, 0.1, 1.65],
  [3.9, 0.6, 0.3, 1.6],
  [0.2, 0.4, 3.1, 1.3],
  [-0.4, 0.4, -3.2, 1.25],
] as const;

/**
 * 3D Interactive Launch Sequence (`LAUNCH` phase) inside the shared persistent `<Canvas>`.
 */
export function LaunchScene() {
  const missionState = useGame((state) => state.mission);
  const design = useGame((state) => state.design);
  const vehicleId = useGame((state) => state.vehicleId);
  const difficulty = useGame((state) => state.profile.difficulty);
  const reducedMotion = useGame((state) => state.settings.reducedMotion);
  const lowQuality = useGame((state) => state.settings.quality === 'low');

  const ascent = useLaunch((s) => s.ascent);
  const rocketGroupRef = useRef<Group>(null);
  const camPos = useRef(new Vector3(11, 6, 16));
  const camLook = useRef(new Vector3(0, 7, 0));

  const { mission, vehicle, summary } = useMemo(() => {
    const m = missionState ? createMission(missionState.pathwayId, missionState.trajectoryId ?? undefined, difficulty) : null;
    const v = getLaunchVehicle(vehicleId ?? 'lv_medium');
    const s = m && design ? summarizeDesign(design, m, v) : null;
    return { mission: m, vehicle: v, summary: s };
  }, [missionState, difficulty, vehicleId, design]);

  useEffect(() => {
    if (mission && summary && vehicle) {
      launchStore.getState().init(mission, summary, vehicle);
    }
  }, [mission, summary, vehicle]);

  useFrame((state, delta) => {
    launchStore.getState().tick(delta);
    const current = launchStore.getState().ascent;
    if (!current || !vehicle) return;

    // Scene Y position: 0 on pad, rises up to 140 scene units in orbit
    const visualY = Math.min(140, Math.pow(current.altitudeM / 1000, 0.72) * 2.4);
    // Gravity turn pitch (0 rad vertical at liftoff -> 1.32 rad near-horizontal in orbit)
    const pitchZ = -Math.min(1.32, Math.max(0, (current.t - 12) / 145) * 1.32);

    if (rocketGroupRef.current) {
      rocketGroupRef.current.position.set(0, 0.75 + visualY, 0);
      rocketGroupRef.current.rotation.set(0, 0, pitchZ);
    }

    const totalH = vehicleHeightM(vehicle.id) * 0.25;
    const focusY = 0.75 + visualY + totalH * 0.62;

    let desiredCam = new Vector3(11, 5.5, 16);
    let desiredLook = new Vector3(0, totalH * 0.52, 0);

    if (current.stage === 'countdown') {
      desiredCam = new Vector3(11, 5.5, 15.5);
      desiredLook = new Vector3(0, totalH * 0.5, 0);
    } else if (current.stage === 'stage1') {
      desiredCam = new Vector3(9.5, Math.max(3.5, focusY - 4.5), 14.5);
      desiredLook = new Vector3(0, focusY - 1.0, 0);
    } else if (current.stage === 'maxQ') {
      desiredCam = new Vector3(6.5, focusY + 1.5, 11.5);
      desiredLook = new Vector3(0, focusY, 0);
    } else if (current.stage === 'meco' || current.stage === 'stage2') {
      desiredCam = new Vector3(5.2, focusY - 1.2, 10.5);
      desiredLook = new Vector3(0, focusY - 0.5, 0);
    } else {
      // Fairing separation & Orbit insertion beauty angle looking over spacecraft and Earth limb
      desiredCam = new Vector3(4.2, focusY + 1.8, 8.2);
      desiredLook = new Vector3(-1.2, focusY + 0.4, 0);
    }

    if (reducedMotion) {
      camPos.current.copy(desiredCam);
      camLook.current.copy(desiredLook);
    } else {
      const lerpFactor = Math.min(1, delta * 5.0);
      camPos.current.lerp(desiredCam, lerpFactor);
      camLook.current.lerp(desiredLook, lerpFactor);
    }

    state.camera.position.copy(camPos.current);
    state.camera.lookAt(camLook.current);
  });

  if (!vehicle || !ascent) return null;

  const totalH = vehicleHeightM(vehicle.id) * 0.25;
  const stage1Firing = ascent.t >= 0 && ascent.t < 62;
  const stage2Firing = ascent.t >= 75 && ascent.stage !== 'insertion' && ascent.stage !== 'orbit';
  const showSmoke = ascent.t >= -1.8 && ascent.altitudeM < 9_000;
  const showEarthLimb = ascent.altitudeM > 14_000;
  const bgColor = ascent.altitudeM < 18_000 ? '#050b18' : ascent.altitudeM < 55_000 ? '#030610' : '#010207';

  return (
    <group>
      <SceneBackground color={bgColor} fog={[45, 240]} />
      <Starfield count={lowQuality ? 1100 : 2200} milkyWay={0.6} seed={9} />
      <hemisphereLight args={['#7ba2e0', '#0a0f18', 0.45]} />
      <directionalLight position={[22, 36, 24]} intensity={2.2} color="#fff6e5" castShadow={!lowQuality} />

      {/* Ground Launch Complex (recedes as rocket climbs) */}
      <group>
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[90, 64]} />
          <meshStandardMaterial color="#0b1018" roughness={0.95} />
        </mesh>
        <mesh position={[0, 0.4, 0]} receiveShadow castShadow>
          <cylinderGeometry args={[5.5, 6.8, 0.8, 8]} />
          <meshStandardMaterial color="#363d4a" roughness={0.88} />
        </mesh>

        {/* Launch umbilical tower */}
        <group position={[-3.4, 0.8, 0]}>
          {[-0.75, 0.75].map((x) =>
            [-0.75, 0.75].map((z) => (
              <mesh key={`${x}${z}`} position={[x, totalH * 0.48, z]} castShadow>
                <boxGeometry args={[0.18, totalH * 0.96, 0.18]} />
                <meshStandardMaterial color="#8a5a2b" roughness={0.7} />
              </mesh>
            )),
          )}
          <mesh position={[0, totalH * 0.98, 0]}>
            <sphereGeometry args={[0.2, 12, 12]} />
            <meshBasicMaterial color="#ff4d4d" toneMapped={false} />
          </mesh>
        </group>

        {/* Pad steam & ignition smoke puffs */}
        {showSmoke &&
          SMOKE_PUFFS.slice(0, lowQuality ? 4 : SMOKE_PUFFS.length).map(([sx, sy, sz, sr], idx) => {
            const expansion = ascent.t >= 0 ? 1 + Math.min(2.2, ascent.t * 0.12) : 0.75;
            return (
              <mesh key={idx} position={[sx * expansion, sy * expansion, sz * expansion]}>
                <sphereGeometry args={[sr * expansion, 14, 14]} />
                <meshStandardMaterial
                  color={ascent.t >= 0 ? '#f3e8d2' : '#cbd5e1'}
                  transparent
                  opacity={Math.max(0.12, 0.55 - ascent.altitudeM / 16_000)}
                  roughness={1}
                />
              </mesh>
            );
          })}
      </group>

      {/* Curved Earth horizon limb visible from upper atmosphere & orbit */}
      {showEarthLimb && (
        <group position={[-18, Math.min(140, Math.pow(ascent.altitudeM / 1000, 0.72) * 2.4) - 44, -22]}>
          <SimplePlanet
            texture={TEXTURES.earthDay}
            radius={38}
            spin={reducedMotion ? 0 : 0.015}
            atmosphere="#5aa8ff"
          />
        </group>
      )}

      {/* Ascending Rocket + Separable Stages + Fairing + Spacecraft */}
      <group ref={rocketGroupRef} position={[0, 0.75, 0]}>
        <RocketModel
          vehicle={vehicle}
          stage1Firing={stage1Firing}
          stage2Firing={stage2Firing}
          throttle={ascent.throttle}
          stage1SepElapsedS={ascent.stage1SepElapsedS}
          fairingSepElapsedS={ascent.fairingSepElapsedS}
          design={design}
        />

        {/* Transonic Max-Q shock/condensation cone around upper stage */}
        {ascent.inMaxQWindow && (
          <mesh position={[0, totalH * 0.76, 0]}>
            <coneGeometry args={[2.1, 2.6, 32, 1, true]} />
            <meshBasicMaterial
              color={ascent.maxQHandled ? '#5ce1ff' : '#ffb547'}
              transparent
              opacity={0.28 * ascent.maxQRatio}
              blending={AdditiveBlending}
              depthWrite={false}
              side={DoubleSide}
              toneMapped={false}
            />
          </mesh>
        )}
      </group>
    </group>
  );
}
