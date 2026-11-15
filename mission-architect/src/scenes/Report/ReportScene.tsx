'use client';

import { Html, OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { type Group, Vector3 } from 'three';

import {
  buildScoreExtras,
  createMission,
  emptyDesign,
  resolveDesign,
  scoreMission,
  SLOT_IDS,
  slotApplicable,
  type EndReason,
  type SlotId,
} from '@/game';
import { useGame } from '@/hooks/useGame';
import type { AssemblyTarget } from '@/scenes/Hangar/assemblyStore';
import { AlarmLight } from '@/three/AlarmLight';
import { SUN_DIRECTION } from '@/three/constants';
import { SceneBackground } from '@/three/SceneBackground';
import { getSocketLayouts, Spacecraft } from '@/three/Spacecraft';
import { Starfield } from '@/three/Starfield';
import { SunLight } from '@/three/SunLight';

import { OutcomeCutscene, reportViewStore, useReportView } from './OutcomeCutscene';

const REPORT_TARGET = new Vector3(0, 0.2, 0);
const REPORT_CAMERA = new Vector3(-5.4, 2.5, 6.8);

function failedTargetFor(endReason: EndReason | null): AssemblyTarget | null {
  switch (endReason) {
    case 'launch_failure':
      return 'bus';
    case 'insertion_failure':
      return 'propulsion';
    case 'power_failure':
      return 'power';
    case 'radiation':
      return 'radiation';
    case 'lifetime':
      return 'computer';
    case 'supplies':
      return 'lifeSupport';
    case 'reentry_failure':
      return 'heatShield';
    default:
      return null;
  }
}

function DataStreamBeams({ reducedMotion }: { reducedMotion: boolean }) {
  const groupRef = useRef<Group>(null);
  useFrame((_, delta) => {
    if (reducedMotion || !groupRef.current) return;
    groupRef.current.rotation.y += delta * 0.45;
  });

  return (
    <group ref={groupRef} position={[0, 1.4, 0]} name="report_telemetry_streams">
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, 0.45 + i * 0.45, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.45 + i * 0.35, 0.018, 12, 48]} />
          <meshBasicMaterial color="#4cf0a0" transparent opacity={0.55 - i * 0.14} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * 3D scene for the REPORT phase (Phase 09 §4):
 * - Plays CS-08 Outcome Cutscene when requested.
 * - Otherwise displays the player's own 3D spacecraft rotating in space,
 *   clickable to highlight the parts referenced in the "Why" analysis,
 *   with telemetry streams on success or a red fault beacon on the failing subsystem.
 */
export function ReportScene() {
  const camera = useThree((state) => state.camera);
  const designState = useGame((state) => state.design);
  const journey = useGame((state) => state.journey);
  const missionState = useGame((state) => state.mission);
  const difficulty = useGame((state) => state.profile.difficulty);
  const crew = useGame((state) => state.profile.crew);
  const decisionLog = useGame((state) => state.decisionLog);
  const challengeResults = useGame((state) => state.challengeResults);
  const reducedMotion = useGame((state) => state.settings.reducedMotion);

  const selectedTarget = useReportView((state) => state.selectedTarget);
  const hoveredTarget = useReportView((state) => state.hoveredTarget);
  const exploded = useReportView((state) => state.exploded);
  const playingCutscene = useReportView((state) => state.playingCutscene);

  const design = journey?.input.design ?? designState ?? emptyDesign();
  const endReason = journey?.endReason ?? null;
  const faultTarget = failedTargetFor(endReason);

  const outcome = useMemo(() => {
    if (!journey) return 'success';
    const extras = buildScoreExtras(journey, challengeResults, crew, decisionLog);
    return scoreMission(journey, extras).outcome;
  }, [journey, challengeResults, crew, decisionLog]);

  useEffect(() => {
    reportViewStore.getState().reset(faultTarget);
  }, [faultTarget]);

  useLayoutEffect(() => {
    if (playingCutscene) return;
    camera.position.copy(REPORT_CAMERA);
    camera.lookAt(REPORT_TARGET);
  }, [camera, playingCutscene]);

  const missionContext = useMemo(() => {
    if (journey) return journey.input.mission;
    if (!missionState) return null;
    return createMission(missionState.pathwayId, missionState.trajectoryId ?? undefined, difficulty);
  }, [journey, missionState, difficulty]);

  const applicableSlots = useMemo(() => {
    if (!missionContext) return new Set<SlotId>(SLOT_IDS);
    return new Set<SlotId>(SLOT_IDS.filter((slot) => slotApplicable(slot, missionContext)));
  }, [missionContext]);

  const resolved = useMemo(() => resolveDesign(design), [design]);
  const sockets = useMemo(() => getSocketLayouts(resolved.bus, exploded), [resolved.bus, exploded]);
  const activeSocket = selectedTarget ? sockets[selectedTarget] : null;
  const faultSocket = faultTarget ? sockets[faultTarget] : null;

  if (playingCutscene) {
    return <OutcomeCutscene onComplete={() => reportViewStore.getState().setPlayingCutscene(false)} />;
  }

  return (
    <>
      <SceneBackground color="#040814" />
      <Starfield count={1800} milkyWay={0.35} seed={19} />
      <SunLight direction={SUN_DIRECTION} />
      <ambientLight intensity={0.48} />
      <directionalLight position={[-6, 4, 6]} intensity={0.75} color="#bae6fd" />

      <group position={[0, 0.2, 0]} name="report_spacecraft_showcase">
        <Spacecraft
          design={design}
          selectedTarget={selectedTarget ?? 'bus'}
          hoveredTarget={hoveredTarget}
          exploded={exploded}
          applicableSlots={applicableSlots}
          onSelectTarget={(target) => reportViewStore.getState().selectTarget(target)}
          onHoverTarget={(target) => reportViewStore.getState().hoverTarget(target)}
        />

        {outcome !== 'failure' && <DataStreamBeams reducedMotion={reducedMotion} />}

        {outcome === 'failure' && faultSocket && (
          <group position={faultSocket.position} name="report_fault_highlight">
            <AlarmLight active reducedMotion={reducedMotion} position={[0, 0.35, 0]} />
            <Html position={[0, 0.65, 0]} center distanceFactor={10} zIndexRange={[1, 5]}>
              <div className="pointer-events-none whitespace-nowrap rounded-full border border-danger/80 bg-danger/25 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-danger backdrop-blur">
                ⚠ Fault: {faultTarget}
              </div>
            </Html>
          </group>
        )}

        {activeSocket && selectedTarget !== faultTarget && (
          <Html
            position={[activeSocket.position[0], activeSocket.position[1] + 0.55, activeSocket.position[2]]}
            center
            distanceFactor={10}
            zIndexRange={[1, 5]}
          >
            <div className="pointer-events-none whitespace-nowrap rounded-full border border-accent/80 bg-space/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent backdrop-blur">
              🔍 Inspecting: {selectedTarget}
            </div>
          </Html>
        )}
      </group>

      <OrbitControls
        makeDefault
        target={REPORT_TARGET}
        enablePan={false}
        enableDamping
        minDistance={3.2}
        maxDistance={16}
        autoRotate={!reducedMotion}
        autoRotateSpeed={0.45}
      />
    </>
  );
}
