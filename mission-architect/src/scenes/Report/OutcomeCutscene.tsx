'use client';

import { useMemo } from 'react';
import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';

import { CutsceneDirector } from '@/cutscenes/CutsceneDirector';
import { outcomeScript } from '@/cutscenes/scripts/CS-08-outcome';
import {
  buildScoreExtras,
  createMission,
  emptyDesign,
  getLaunchVehicle,
  scoreMission,
  startJourney,
  type EndReason,
  type MissionOutcome,
} from '@/game';
import { useGame } from '@/hooks/useGame';
import type { AssemblyTarget } from '@/scenes/Hangar/assemblyStore';

export interface ReportViewState {
  selectedTarget: AssemblyTarget | null;
  hoveredTarget: AssemblyTarget | null;
  exploded: boolean;
  playingCutscene: boolean;
  selectTarget: (target: AssemblyTarget | null) => void;
  hoverTarget: (target: AssemblyTarget | null) => void;
  toggleExploded: () => void;
  setPlayingCutscene: (playing: boolean) => void;
  reset: (defaultTarget?: AssemblyTarget | null) => void;
}

export const reportViewStore = createStore<ReportViewState>()((set) => ({
  selectedTarget: null,
  hoveredTarget: null,
  exploded: false,
  playingCutscene: false,
  selectTarget: (selectedTarget) => set({ selectedTarget }),
  hoverTarget: (hoveredTarget) => set({ hoveredTarget }),
  toggleExploded: () => set((state) => ({ exploded: !state.exploded })),
  setPlayingCutscene: (playingCutscene) => set({ playingCutscene }),
  reset: (defaultTarget = null) =>
    set({
      selectedTarget: defaultTarget,
      hoveredTarget: null,
      exploded: false,
      playingCutscene: false,
    }),
}));

export function useReportView<T>(selector: (state: ReportViewState) => T): T {
  return useStore(reportViewStore, selector);
}

/** CS-08 Outcome Cutscene player inside the shared 3D canvas (Phase 09 §4). */
export function OutcomeCutscene({ onComplete }: { onComplete: () => void }) {
  const journey = useGame((state) => state.journey);
  const missionState = useGame((state) => state.mission);
  const designState = useGame((state) => state.design);
  const vehicleId = useGame((state) => state.vehicleId);
  const difficulty = useGame((state) => state.profile.difficulty);
  const crew = useGame((state) => state.profile.crew);
  const decisionLog = useGame((state) => state.decisionLog);
  const challengeResults = useGame((state) => state.challengeResults);

  const { missionContext, outcome, endReason } = useMemo(() => {
    if (journey) {
      const extras = buildScoreExtras(journey, challengeResults, crew, decisionLog);
      const s = scoreMission(journey, extras);
      return {
        missionContext: journey.input.mission,
        outcome: s.outcome,
        endReason: journey.endReason,
      };
    }
    const pathwayId = missionState?.pathwayId ?? 'leo';
    const ctx = createMission(pathwayId, missionState?.trajectoryId ?? undefined, difficulty);
    const vehicle = getLaunchVehicle(vehicleId ?? 'lv_medium');
    const fallbackJourney = startJourney({
      design: designState ?? emptyDesign(),
      mission: ctx,
      vehicle,
      seed: 1,
    });
    return {
      missionContext: ctx,
      outcome: 'partial' as MissionOutcome,
      endReason: fallbackJourney.endReason as EndReason | null,
    };
  }, [journey, missionState, designState, vehicleId, difficulty, crew, decisionLog, challengeResults]);

  const script = useMemo(
    () => outcomeScript(missionContext, outcome, endReason),
    [missionContext, outcome, endReason],
  );

  return <CutsceneDirector script={script} onComplete={onComplete} />;
}
