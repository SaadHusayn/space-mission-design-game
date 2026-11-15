import { describe, expect, it } from 'vitest';

import { createCrew } from '../core/crew';
import {
  computeDesignHash,
  deleteSavedDesign,
  exportDesignBundle,
  getChapterLeaderboard,
  importDesignBundle,
  loadSavedDesigns,
  loadSavedRuns,
  recordRunToStorage,
  saveDesignToStorage,
  type SimpleStorage,
} from '../core/save';
import { createGameStore } from '../core/store';
import { getLaunchVehicle } from '../data/loadData';
import { PATHWAY_IDS } from '../data/schemas';
import { compareRuns, createSavedRunSnapshot } from './compare';
import { WINNING_DESIGNS, type DesignFixture } from './fixtures/designs';
import { runJourney } from './journey';
import { createMission } from './mission';
import {
  buildCrewAwards,
  buildErbVsReality,
  buildPhysicsRecap,
  buildScoreExtras,
  scoreMission,
} from './scoring';
import { anotherWayToWin, explainMission, realMissionsForPathway } from './why';

function fixture(name: string): DesignFixture {
  const found = WINNING_DESIGNS.find((item) => item.name.startsWith(name));
  if (!found) throw new Error(`no fixture ${name}`);
  return found;
}

function makeMemoryStorage(): SimpleStorage {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, val) => {
      map.set(key, val);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

describe('Phase 09 evaluation, ERB vs Reality, physics recap, crew awards, and Why analysis', () => {
  it('builds ERB vs Reality rows, physics recap, and crew awards for winning and failed missions', () => {
    const jupA = fixture('Jupiter A');
    const state = runJourney({
      design: structuredClone(jupA.design),
      mission: createMission(jupA.pathway, jupA.trajectory, 'engineer'),
      vehicle: getLaunchVehicle(jupA.vehicle),
      seed: 1,
    });
    const crew = createCrew(4, ['Nova', 'Bolt', 'Lyra', 'Pulse']);
    const extras = buildScoreExtras(state, [], crew, []);
    const score = scoreMission(state, extras);

    const erbRows = buildErbVsReality(state, score);
    expect(erbRows.length).toBeGreaterThanOrEqual(5);
    expect(erbRows.every((r) => r.verdict === 'matched' || r.verdict === 'tight_margin')).toBe(true);
    expect(erbRows.some((r) => r.targetSlot === 'propulsion')).toBe(true);
    expect(erbRows.some((r) => r.targetSlot === 'power')).toBe(true);

    const recap = buildPhysicsRecap(state, score, []);
    expect(recap.length).toBeGreaterThanOrEqual(3);
    expect(recap[0].formula.length).toBeGreaterThan(3);

    const awards = buildCrewAwards(state, score, crew, []);
    expect(awards).toHaveLength(4);
    expect(awards.map((a) => a.id)).toEqual([
      'best_call',
      'budget_hawk',
      'science_hero',
      'systems_guardian',
    ]);
    expect(awards[0].recipientCallSign).toBe('Nova');

    const why = explainMission(state, score, 6, { flybyRadii: 2 });
    expect(why.length).toBeGreaterThanOrEqual(3);
    expect(why.some((b) => b.text.includes('2 R_J'))).toBe(true);
    expect(why.some((b) => b.targetSlot !== undefined)).toBe(true);
  });

  it('provides Another Way to Win hints and Real Missions cards for all 6 pathways', () => {
    for (const pathwayId of PATHWAY_IDS) {
      const hint = anotherWayToWin(pathwayId);
      expect(hint).not.toBeNull();
      expect(hint?.pathwayId).toBe(pathwayId);
      expect(hint?.headline).toMatch(/Another way to win/);

      const realCards = realMissionsForPathway(pathwayId);
      expect(realCards.length).toBeGreaterThanOrEqual(1);
      expect(realCards[0].keyPhysics.length).toBeGreaterThan(20);
    }
  });
});

describe('Phase 09 persistence: save/load, export/import, leaderboard, and run comparison', () => {
  it('saves, loads, deletes, exports, and imports spacecraft designs via JSON and MA1 share code', () => {
    const storage = makeMemoryStorage();
    const leoA = fixture('LEO A');

    const saved = saveDesignToStorage(
      {
        name: 'My Orbital Explorer',
        pathwayId: 'leo',
        trajectoryId: leoA.trajectory,
        vehicleId: leoA.vehicle,
        difficulty: 'engineer',
        design: leoA.design,
      },
      storage,
    );
    expect(saved).toHaveLength(1);
    expect(saved[0].designHash).toMatch(/^#[0-9A-F]{6}$/);
    expect(loadSavedDesigns(storage)).toHaveLength(1);

    const exported = exportDesignBundle({
      name: 'My Orbital Explorer',
      pathwayId: 'leo',
      trajectoryId: leoA.trajectory,
      vehicleId: leoA.vehicle,
      difficulty: 'engineer',
      design: leoA.design,
      runSummary: {
        callSign: 'Nova',
        outcome: 'success',
        score: 92,
        grade: 'A',
        stars: 3,
        science: 135,
        totalCost: 195,
        wetMass: 2420,
        deltaV: 620,
      },
    });
    expect(exported.shareCode.startsWith('MA1:')).toBe(true);

    const fromCode = importDesignBundle(exported.shareCode);
    expect(fromCode.ok).toBe(true);
    if (fromCode.ok) {
      expect(fromCode.data.name).toBe('My Orbital Explorer');
      expect(fromCode.data.design.busId).toBe('capsule_crew');
      expect(fromCode.data.designHash).toBe(
        computeDesignHash(leoA.design, 'leo', leoA.trajectory, leoA.vehicle),
      );
    }

    const fromJson = importDesignBundle(exported.json);
    expect(fromJson.ok).toBe(true);

    const badImport = importDesignBundle('MA1:not-valid-json!!!');
    expect(badImport.ok).toBe(false);

    deleteSavedDesign(saved[0].id, storage);
    expect(loadSavedDesigns(storage)).toHaveLength(0);
  });

  it('records mission runs, ranks the local chapter leaderboard, and compares two runs side by side', () => {
    const storage = makeMemoryStorage();
    const leoA = fixture('LEO A');
    const leoB = fixture('LEO B');

    const stateA = runJourney({
      design: structuredClone(leoA.design),
      mission: createMission(leoA.pathway, leoA.trajectory, 'engineer'),
      vehicle: getLaunchVehicle(leoA.vehicle),
      seed: 1,
    });
    const scoreA = scoreMission(stateA, { physics: 1 });
    const runA = createSavedRunSnapshot({
      id: 'run-leo-a',
      state: stateA,
      score: scoreA,
      callSign: 'Nova',
    });

    const stateB = runJourney({
      design: structuredClone(leoB.design),
      mission: createMission(leoB.pathway, leoB.trajectory, 'engineer'),
      vehicle: getLaunchVehicle(leoB.vehicle),
      seed: 1,
    });
    const scoreB = scoreMission(stateB, { physics: 0.5 });
    const runB = createSavedRunSnapshot({
      id: 'run-leo-b',
      state: stateB,
      score: scoreB,
      callSign: 'Comet',
    });

    recordRunToStorage(runA, storage);
    recordRunToStorage(runB, storage);
    expect(loadSavedRuns(storage)).toHaveLength(2);

    const board = getChapterLeaderboard('leo', storage);
    expect(board).toHaveLength(2);
    expect(board[0].score).toBeGreaterThanOrEqual(board[1].score);

    const comparison = compareRuns(runA, runB);
    expect(comparison.scoreDelta).toBe(runB.score - runA.score);
    expect(comparison.changedCount).toBeGreaterThan(0);
    expect(comparison.designDiffs.some((d) => d.id === 'trajectory' && d.changed)).toBe(true);
    expect(comparison.designDiffs.some((d) => d.id === 'vehicle' && d.changed)).toBe(true);
  });

  it('supports finishJourney, redesignAndRefly, and tryAnotherTrajectory in the store', () => {
    const store = createGameStore();
    store.getState().goTo('TITLE');
    store.getState().goTo('CHAPTER_SELECT');
    store.getState().selectPathway('leo', true);
    store.getState().openObjective();
    store.getState().acceptMission();

    const leoA = fixture('LEO A');
    store.getState().loadDesignForRefly(leoA.design, {
      pathwayId: 'leo',
      trajectoryId: leoA.trajectory,
      vehicleId: leoA.vehicle,
    });
    expect(store.getState().phase).toBe('ASSEMBLY');
    expect(store.getState().design?.busId).toBe('capsule_crew');

    expect(store.getState().submitToErb()).toBe(true);
    expect(store.getState().proceedFromErb()).toBe(true);
    expect(store.getState().proceedToLaunchVehicle()).toBe(true);
    expect(store.getState().selectLaunchVehicle(leoA.vehicle)).toBe(true);
    expect(store.getState().proceedToGoNoGo()).toBe(true);
    expect(store.getState().confirmGoForLaunch()).toBe(true);
    expect(store.getState().startLaunch()).toBe(true);
    expect(
      store.getState().completeLaunch({
        vehicleId: leoA.vehicle,
        ignitionStatus: 'clean',
        ignitionBonusDv: 25,
        maxQHandled: true,
        structuralWarning: false,
        peakDynamicPressureKPa: 28,
        finalAltitudeKm: 400,
        finalVelocityKms: 7.67,
        deltaVMargin: 100,
        insertionResult: null,
      }),
    ).toBe(true);

    // Run journey to completion
    for (let i = 0; i < 15 && !store.getState().journey?.ended; i++) {
      if (store.getState().journey?.pending) {
        const opt = store.getState().journey!.pending!.options[0].id;
        store.getState().chooseEventOption(opt);
      } else {
        store.getState().stepJourney(5);
      }
    }
    expect(store.getState().journey?.ended).toBe(true);
    expect(store.getState().finishJourney()).toBe(true);
    expect(store.getState().phase).toBe('REPORT');
    // Chapter 1 stars recorded automatically -> unlocks Moon!
    expect(store.getState().profile.progress.leo?.stars).toBeGreaterThanOrEqual(2);

    // Redesign & Re-fly returns to ASSEMBLY with the design intact
    expect(store.getState().redesignAndRefly()).toBe(true);
    expect(store.getState().phase).toBe('ASSEMBLY');
    expect(store.getState().design?.busId).toBe('capsule_crew');
    expect(store.getState().design?.options.fuelMass).toBe(520);
  });
});
