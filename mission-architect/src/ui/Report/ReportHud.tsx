'use client';

import { useMemo, useState } from 'react';

import { CutsceneOverlay } from '@/cutscenes/CutsceneOverlay';
import {
  anotherWayToWin,
  buildCrewAwards,
  buildErbVsReality,
  buildPhysicsRecap,
  buildScoreExtras,
  computeDesignHash,
  createMission,
  createSavedRunSnapshot,
  emptyDesign,
  explainMission,
  getLaunchVehicle,
  getPathway,
  realMissionsForPathway,
  runJourney,
  scoreMission,
  type PathwayId,
} from '@/game';
import { UNLOCKED_BY } from '@/game/core/progress';
import { useGame } from '@/hooks/useGame';
import { useReportView } from '@/scenes/Report/OutcomeCutscene';
import { CompareRuns } from '@/ui/CompareRuns';
import { DecisionLog } from '@/ui/DecisionLog';
import { ExportDesign } from '@/ui/ExportDesign';
import { Leaderboard } from '@/ui/Leaderboard';

import { CrewAwards } from './CrewAwards';
import { ErbVsReality } from './ErbVsReality';
import { Headline } from './Headline';
import { PhysicsRecap } from './PhysicsRecap';
import { RealMissionCard } from './RealMissionCard';
import { ReportActions } from './ReportActions';
import { RequirementsResult } from './RequirementsResult';
import { ScoreBars } from './ScoreBars';
import { WhyList } from './WhyList';

const PATHWAY_ORDER: readonly PathwayId[] = [
  'leo',
  'moon',
  'mars',
  'jupiter',
  'interstellar',
  'exoplanet',
];

export function ReportHud() {
  const playingCutscene = useReportView((state) => state.playingCutscene);
  const journey = useGame((state) => state.journey);
  const missionState = useGame((state) => state.mission);
  const designState = useGame((state) => state.design);
  const vehicleIdState = useGame((state) => state.vehicleId);
  const profile = useGame((state) => state.profile);
  const decisionLog = useGame((state) => state.decisionLog);
  const challengeResults = useGame((state) => state.challengeResults);
  const flybyRadii = useGame((state) => state.flybyRadii);

  const redesignAndRefly = useGame((state) => state.redesignAndRefly);
  const tryAnotherTrajectory = useGame((state) => state.tryAnotherTrajectory);
  const loadDesignForRefly = useGame((state) => state.loadDesignForRefly);
  const goTo = useGame((state) => state.goTo);

  const [modal, setModal] = useState<'none' | 'save' | 'compare' | 'leaderboard' | 'log'>('none');

  // Ensure we always have a valid JourneyState to evaluate (even if a test jumped straight to REPORT)
  const effectiveJourney = useMemo(() => {
    if (journey) return journey;
    const pathwayId = missionState?.pathwayId ?? 'leo';
    const missionCtx = createMission(pathwayId, missionState?.trajectoryId ?? undefined, profile.difficulty);
    const vehicle = getLaunchVehicle(vehicleIdState ?? 'lv_medium');
    return runJourney({
      design: designState ?? emptyDesign(),
      mission: missionCtx,
      vehicle,
      seed: 1,
    });
  }, [journey, missionState, designState, vehicleIdState, profile.difficulty]);

  const reportData = useMemo(() => {
    const extras = buildScoreExtras(effectiveJourney, challengeResults, profile.crew, decisionLog);
    const score = scoreMission(effectiveJourney, extras);
    const why = explainMission(effectiveJourney, score, 6, { decisionLog, flybyRadii });
    const erbRows = buildErbVsReality(effectiveJourney, score);
    const physicsItems = buildPhysicsRecap(effectiveJourney, score, challengeResults);
    const awards = buildCrewAwards(effectiveJourney, score, profile.crew, decisionLog);
    const missionCtx = effectiveJourney.input.mission;
    const pathwayId = missionCtx.pathway.id;
    const anotherWay = anotherWayToWin(pathwayId, missionCtx.trajectory.id);
    const realMissions = realMissionsForPathway(pathwayId);
    const designHash = computeDesignHash(
      effectiveJourney.input.design,
      pathwayId,
      missionCtx.trajectory.id,
      effectiveJourney.input.vehicle.id,
    );
    const crewNames = profile.crew.map((c) => c.callSign.trim()).filter(Boolean);
    const callSign = crewNames[0] || 'Pathfinder';
    const currentRun = createSavedRunSnapshot({
      id: 'current-mission-run',
      state: effectiveJourney,
      score,
      callSign,
      crewNames: crewNames.length > 0 ? crewNames : [callSign],
      patch: profile.patch,
      difficulty: profile.difficulty,
    });

    const nextPathwayId = PATHWAY_ORDER.find((id) => UNLOCKED_BY[id] === pathwayId) ?? null;
    const unlockedNextChapterLabel =
      score.stars >= 1 && nextPathwayId ? getPathway(nextPathwayId).name : null;

    return {
      missionCtx,
      pathwayId,
      score,
      why,
      erbRows,
      physicsItems,
      awards,
      anotherWay,
      realMissions,
      designHash,
      callSign,
      currentRun,
      unlockedNextChapterLabel,
    };
  }, [effectiveJourney, challengeResults, profile, decisionLog, flybyRadii]);

  if (playingCutscene) {
    return <CutsceneOverlay />;
  }

  const {
    missionCtx,
    pathwayId,
    score,
    why,
    erbRows,
    physicsItems,
    awards,
    anotherWay,
    realMissions,
    designHash,
    callSign,
    currentRun,
    unlockedNextChapterLabel,
  } = reportData;

  return (
    <div
      aria-label="Post-Mission Debrief and Evaluation Report"
      className="pointer-events-none absolute inset-0 flex flex-col justify-between overflow-y-auto p-3 sm:p-5"
    >
      {/* Top Headline */}
      <div className="pointer-events-auto">
        <Headline
          mission={missionCtx}
          score={score}
          patch={profile.patch}
          designHash={designHash}
          onOpenDecisionLog={() => setModal('log')}
        />
      </div>

      {/* Main Report Grid — leaves room in center-left on desktop so the rotating 3D spacecraft stays visible & clickable */}
      <div className="my-3 grid flex-1 gap-3 lg:grid-cols-12">
        {/* Left Column: Score Breakdown, Contract Checklist, Crew Awards */}
        <div className="pointer-events-auto space-y-3 lg:col-span-4">
          <ScoreBars components={score.components} total={score.total} />
          <RequirementsResult requirements={score.requirements} />
          <CrewAwards awards={awards} />
        </div>

        {/* Center 3D Viewport Spacer on large screens so the player can orbit & click their 3D spacecraft */}
        <div className="pointer-events-none hidden flex-col justify-end pb-2 lg:col-span-3 lg:flex">
          <div className="rounded-xl border border-line/70 bg-space/75 px-3 py-2 text-center text-[11px] text-muted backdrop-blur">
            🛸 <span className="font-semibold text-ink">Interactive 3D Spacecraft</span> — drag to rotate or click any part / &ldquo;Why&rdquo; bullet to inspect subsystem margins
          </div>
        </div>

        {/* Right Column: "Why" Analysis, ERB vs Reality, Physics Recap, Real Missions */}
        <div className="pointer-events-auto space-y-3 lg:col-span-5">
          <WhyList
            bullets={why}
            anotherWay={anotherWay}
            onLoadAnotherWay={(hint) => {
              loadDesignForRefly(hint.design, {
                pathwayId: hint.pathwayId,
                trajectoryId: hint.trajectoryId,
                vehicleId: hint.vehicleId,
              });
            }}
          />
          <ErbVsReality rows={erbRows} />
          <PhysicsRecap items={physicsItems} />
          <RealMissionCard missions={realMissions} />
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="pointer-events-auto">
        <ReportActions
          onRedesignAndRefly={() => redesignAndRefly()}
          onTryAnotherTrajectory={() => tryAnotherTrajectory()}
          onNextChapter={() => goTo('CHAPTER_SELECT')}
          onOpenSaveExport={() => setModal('save')}
          onOpenCompare={() => setModal('compare')}
          onOpenLeaderboard={() => setModal('leaderboard')}
          unlockedNextChapterLabel={unlockedNextChapterLabel}
        />
      </div>

      {/* Modals */}
      {modal === 'save' && (
        <ExportDesign
          pathwayId={pathwayId}
          trajectoryId={missionCtx.trajectory.id}
          vehicleId={effectiveJourney.input.vehicle.id}
          difficulty={profile.difficulty}
          design={effectiveJourney.input.design}
          callSign={callSign}
          score={score}
          science={effectiveJourney.science}
          onClose={() => setModal('none')}
          onLoadDesign={(bundle) => {
            setModal('none');
            loadDesignForRefly(bundle.design, {
              pathwayId: bundle.pathwayId,
              trajectoryId: bundle.trajectoryId,
              vehicleId: bundle.vehicleId,
            });
          }}
        />
      )}

      {modal === 'compare' && (
        <CompareRuns
          currentRun={currentRun}
          onClose={() => setModal('none')}
          onLoadDesign={(run) => {
            setModal('none');
            loadDesignForRefly(run.design, {
              pathwayId: run.pathwayId,
              trajectoryId: run.trajectoryId,
              vehicleId: run.vehicleId,
            });
          }}
        />
      )}

      {modal === 'leaderboard' && (
        <Leaderboard
          initialPathwayId={pathwayId}
          onClose={() => setModal('none')}
          onLoadRunDesign={(run) => {
            setModal('none');
            loadDesignForRefly(run.design, {
              pathwayId: run.pathwayId,
              trajectoryId: run.trajectoryId,
              vehicleId: run.vehicleId,
            });
          }}
        />
      )}

      {modal === 'log' && (
        <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl">
            <DecisionLog
              decisionLog={decisionLog}
              crew={profile.crew}
              events={effectiveJourney.events}
              onClose={() => setModal('none')}
            />
          </div>
        </div>
      )}
    </div>
  );
}
