import { describe, expect, it } from 'vitest';
import type { StateStorage } from 'zustand/middleware';

import { SETTINGS_STORAGE_KEY, createGameStore } from './store';

function memoryStorage(initial: Record<string, string> = {}): StateStorage & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value;
    },
    removeItem: (key) => {
      delete data[key];
    },
  };
}

describe('game store', () => {
  it('starts at BOOT with default settings', () => {
    const store = createGameStore();
    expect(store.getState().phase).toBe('BOOT');
    expect(store.getState().settings).toEqual({ quality: 'high', reducedMotion: false });
    expect(store.getState().settingsOpen).toBe(false);
  });

  it('takes the reduced-motion default from the OS preference', () => {
    const store = createGameStore({ prefersReducedMotion: true });
    expect(store.getState().settings.reducedMotion).toBe(true);
  });

  it('allows valid transitions and rejects invalid ones', () => {
    const store = createGameStore();
    expect(store.getState().goTo('REPORT')).toBe(false);
    expect(store.getState().phase).toBe('BOOT');
    expect(store.getState().goTo('TITLE')).toBe(true);
    expect(store.getState().goTo('PROLOGUE')).toBe(true);
    expect(store.getState().phase).toBe('PROLOGUE');
    expect(store.getState().goTo('LAUNCH')).toBe(false);
    expect(store.getState().phase).toBe('PROLOGUE');
  });

  it('updates settings without touching the other ones', () => {
    const store = createGameStore();
    store.getState().setSetting('quality', 'low');
    expect(store.getState().settings).toEqual({ quality: 'low', reducedMotion: false });
    store.getState().setSettingsOpen(true);
    expect(store.getState().settingsOpen).toBe(true);
  });

  it('saves only the settings and the profile', () => {
    const storage = memoryStorage();
    const store = createGameStore({ storage });
    store.getState().goTo('TITLE');
    store.getState().setSetting('quality', 'low');
    const saved = JSON.parse(storage.data[SETTINGS_STORAGE_KEY]);
    expect(Object.keys(saved.state).sort()).toEqual(['profile', 'settings']);
    expect(saved.state.settings).toEqual({ quality: 'low', reducedMotion: false });
  });

  it('restores saved settings but always restarts at BOOT', () => {
    const storage = memoryStorage({
      [SETTINGS_STORAGE_KEY]: JSON.stringify({
        state: { settings: { quality: 'low', reducedMotion: true }, phase: 'REPORT' },
        version: 1,
      }),
    });
    const store = createGameStore({ storage });
    expect(store.getState().settings).toEqual({ quality: 'low', reducedMotion: true });
    expect(store.getState().phase).toBe('BOOT');
  });

  it('keeps defaults for settings missing from an older save', () => {
    const storage = memoryStorage({
      [SETTINGS_STORAGE_KEY]: JSON.stringify({ state: { settings: { quality: 'low' } }, version: 1 }),
    });
    const store = createGameStore({ storage, prefersReducedMotion: true });
    expect(store.getState().settings).toEqual({ quality: 'low', reducedMotion: true });
  });
});

describe('save migration after the rename', () => {
  it('moves a save from the old key to the new one, once', async () => {
    const { LEGACY_STORAGE_KEYS, migrateLegacySave } = await import('./store');
    const data: Record<string, string> = { [LEGACY_STORAGE_KEYS[0]]: JSON.stringify({ state: { settings: { quality: 'low', reducedMotion: true } }, version: 2 }) };
    const storage = {
      getItem: (key: string) => data[key] ?? null,
      setItem: (key: string, value: string) => {
        data[key] = value;
      },
      removeItem: (key: string) => {
        delete data[key];
      },
    };
    const store = createGameStore({ storage });
    expect(store.getState().settings).toEqual({ quality: 'low', reducedMotion: true });
    expect(data[LEGACY_STORAGE_KEYS[0]]).toBeUndefined();
    expect(data[SETTINGS_STORAGE_KEY]).toBeDefined();
    data[LEGACY_STORAGE_KEYS[0]] = 'stale';
    migrateLegacySave(storage);
    expect(data[LEGACY_STORAGE_KEYS[0]]).toBe('stale');
  });
});

describe('spacecraft design state (P05)', () => {
  /** A store in the ASSEMBLY phase with an empty design for the LEO mission. */
  function assemblyStore() {
    const store = createGameStore();
    const s = store.getState();
    s.goTo('TITLE');
    s.goTo('CHAPTER_SELECT');
    expect(s.selectPathway('leo')).toBe(true);
    s.openObjective();
    expect(s.acceptMission()).toBe(true);
    return store;
  }

  it('creates an empty design when the mission is accepted', () => {
    const store = assemblyStore();
    const s = store.getState();
    expect(s.phase).toBe('ASSEMBLY');
    expect(s.design).toEqual({
      busId: null,
      slots: {
        power: null, battery: null, computer: null, adcs: null, comms: null, propulsion: null,
        radiation: null, thermal: null, lifeSupport: null, habitat: null, heatShield: null,
      },
      instrumentIds: [],
      options: { fuelMass: 0, supplyDays: 0, spinArmLength: 0 },
    });
    expect(s.decisionLog).toEqual([]);
  });

  it('has no design state before a mission is chosen', () => {
    const store = createGameStore();
    const s = store.getState();
    s.goTo('TITLE');
    expect(s.design).toBeNull();
    expect(s.editDesign({ kind: 'equip', slot: 'power', partId: 'solar_small' })).toBe(false);
    s.undoDesign(); // must not throw without a design
    s.redoDesign();
    expect(s.design).toBeNull();
  });

  it('equips a part, logs the decision with resource deltas, and supports undo/redo', () => {
    const store = assemblyStore();

    expect(store.getState().editDesign({ kind: 'bus', partId: 'capsule_crew' })).toBe(true);
    expect(store.getState().design?.busId).toBe('capsule_crew');

    expect(store.getState().editDesign({ kind: 'equip', slot: 'power', partId: 'solar_crew' })).toBe(true);
    expect(store.getState().design?.slots.power).toBe('solar_crew');

    // The decision log recorded both choices with the acting role and deltas.
    const { decisionLog } = store.getState();
    expect(decisionLog).toHaveLength(2);
    const busEntry = decisionLog[0];
    expect(busEntry.actor).toBe('engineer');
    expect(busEntry.kind).toBe('bus');
    expect(busEntry.partName).toBe('Crew capsule (2 seats)');
    expect(busEntry.deltas.mass).toBeGreaterThan(0);
    expect(busEntry.deltas.cost).toBeGreaterThan(0);
    const powerEntry = decisionLog[1];
    expect(powerEntry.actor).toBe('engineer');
    expect(powerEntry.slotId).toBe('power');
    expect(powerEntry.deltas.mass).toBeGreaterThan(0); // the array itself has mass
    // Solar arrays draw no power themselves, so the load doesn't change.
    expect(powerEntry.deltas.power).toBeUndefined();

    // Undo restores the previous design, redo brings it back.
    store.getState().undoDesign();
    expect(store.getState().design?.slots.power).toBeNull();
    store.getState().redoDesign();
    expect(store.getState().design?.slots.power).toBe('solar_crew');
    // Undo/redo never add decision-log entries.
    expect(store.getState().decisionLog).toHaveLength(2);
  });

  it('rejects changes that are invalid or no-ops', () => {
    const store = assemblyStore();
    const s = store.getState();
    expect(s.editDesign({ kind: 'equip', slot: 'power', partId: 'comms_ka' })).toBe(false);
    expect(s.editDesign({ kind: 'bus', partId: 'solar_small' })).toBe(false);
    expect(store.getState().decisionLog).toHaveLength(0);
    s.editDesign({ kind: 'bus', partId: 'capsule_crew' });
    const logLength = store.getState().decisionLog.length;
    expect(s.editDesign({ kind: 'bus', partId: 'capsule_crew' })).toBe(false);
    expect(store.getState().decisionLog).toHaveLength(logLength);
  });

  it('records instrument decisions for the science role', () => {
    const store = assemblyStore();
    store.getState().editDesign({ kind: 'bus', partId: 'capsule_crew' });
    store.getState().editDesign({ kind: 'equip', slot: 'computer', partId: 'computer_standard' });
    store.getState().editDesign({ kind: 'equip', slot: 'comms', partId: 'comms_sband' });
    store.getState().editDesign({ kind: 'addInstrument', partId: 'inst_imager' });
    const { decisionLog } = store.getState();
    const entry = decisionLog[3];
    expect(entry.actor).toBe('science');
    expect(entry.kind).toBe('addInstrument');
    // Science only counts once the data can get home and the craft can live.
    expect(entry.deltas.science).toBeGreaterThan(0);
    expect(entry.deltas.data).toBeGreaterThan(0);
    store.getState().editDesign({ kind: 'removeInstrument', partId: 'inst_imager' });
    const removal = store.getState().decisionLog[4];
    expect(removal.kind).toBe('removeInstrument');
    expect(removal.partName).toBe('Multispectral imager');
  });

  it('gates ERB_REVIEW to TRAJECTORY until all mandatory review checks pass', () => {
    const store = assemblyStore();
    expect(store.getState().submitToErb()).toBe(true);
    expect(store.getState().phase).toBe('ERB_REVIEW');
    // An empty design fails ERB-0 and cannot proceed to TRAJECTORY.
    expect(store.getState().proceedFromErb()).toBe(false);
    expect(store.getState().phase).toBe('ERB_REVIEW');

    // Return to assembly and build a winning LEO design.
    expect(store.getState().goTo('ASSEMBLY')).toBe(true);
    const s = store.getState();
    s.editDesign({ kind: 'bus', partId: 'capsule_crew' });
    s.editDesign({ kind: 'equip', slot: 'power', partId: 'solar_crew' });
    s.editDesign({ kind: 'equip', slot: 'battery', partId: 'battery_medium' });
    s.editDesign({ kind: 'equip', slot: 'computer', partId: 'computer_standard' });
    s.editDesign({ kind: 'equip', slot: 'adcs', partId: 'adcs_wheels' });
    s.editDesign({ kind: 'equip', slot: 'comms', partId: 'comms_sband' });
    s.editDesign({ kind: 'equip', slot: 'propulsion', partId: 'prop_biprop' });
    s.editDesign({ kind: 'equip', slot: 'thermal', partId: 'thermal_basic' });
    s.editDesign({ kind: 'equip', slot: 'lifeSupport', partId: 'ls_stored' });
    s.editDesign({ kind: 'equip', slot: 'heatShield', partId: 'shield_leo' });
    s.editDesign({ kind: 'addInstrument', partId: 'inst_imager' });
    s.editDesign({ kind: 'option', key: 'fuelMass', value: 520 });
    s.editDesign({ kind: 'option', key: 'supplyDays', value: 6 });

    expect(store.getState().submitToErb()).toBe(true);
    expect(store.getState().proceedFromErb()).toBe(true);
    expect(store.getState().phase).toBe('TRAJECTORY');
  });

  it('choosing a new pathway clears the design and its history', () => {
    const store = assemblyStore();
    store.getState().editDesign({ kind: 'bus', partId: 'capsule_crew' });
    expect(store.getState().design).not.toBeNull();
    // Back through the objective screen (ASSEMBLY → OBJECTIVE → CHAPTER_SELECT).
    store.getState().openObjective();
    store.getState().backToMap();
    expect(store.getState().selectPathway('leo')).toBe(true);
    expect(store.getState().design).toBeNull();
    expect(store.getState().decisionLog).toEqual([]);
  });

  it('keeps the design out of the persisted save', () => {
    const storage = memoryStorage();
    const store = createGameStore({ storage });
    const s = store.getState();
    s.goTo('TITLE');
    s.goTo('CHAPTER_SELECT');
    s.selectPathway('leo');
    s.openObjective();
    s.acceptMission();
    s.editDesign({ kind: 'bus', partId: 'capsule_crew' });
    const saved = JSON.parse(storage.data[SETTINGS_STORAGE_KEY]);
    expect(Object.keys(saved.state).sort()).toEqual(['profile', 'settings']);
  });
});

describe('trajectory, launch vehicle, GO/NO-GO & launch state (P06)', () => {
  function trajectoryReadyStore() {
    const store = createGameStore();
    const s = store.getState();
    s.goTo('TITLE');
    s.goTo('CHAPTER_SELECT');
    s.selectPathway('leo');
    s.openObjective();
    s.acceptMission();
    s.editDesign({ kind: 'bus', partId: 'capsule_crew' });
    s.editDesign({ kind: 'equip', slot: 'power', partId: 'solar_crew' });
    s.editDesign({ kind: 'equip', slot: 'battery', partId: 'battery_medium' });
    s.editDesign({ kind: 'equip', slot: 'computer', partId: 'computer_standard' });
    s.editDesign({ kind: 'equip', slot: 'adcs', partId: 'adcs_wheels' });
    s.editDesign({ kind: 'equip', slot: 'comms', partId: 'comms_sband' });
    s.editDesign({ kind: 'equip', slot: 'propulsion', partId: 'prop_biprop' });
    s.editDesign({ kind: 'equip', slot: 'thermal', partId: 'thermal_basic' });
    s.editDesign({ kind: 'equip', slot: 'lifeSupport', partId: 'ls_stored' });
    s.editDesign({ kind: 'equip', slot: 'heatShield', partId: 'shield_leo' });
    s.editDesign({ kind: 'addInstrument', partId: 'inst_imager' });
    s.editDesign({ kind: 'option', key: 'fuelMass', value: 520 });
    s.editDesign({ kind: 'option', key: 'supplyDays', value: 6 });
    expect(s.submitToErb()).toBe(true);
    expect(store.getState().proceedFromErb()).toBe(true);
    expect(store.getState().phase).toBe('TRAJECTORY');
    return store;
  }

  it('selects a trajectory option, logs the decision, and proceeds to LAUNCH_VEHICLE', () => {
    const store = trajectoryReadyStore();
    expect(store.getState().mission?.trajectoryId).toBe('leo_400');
    expect(store.getState().selectTrajectory('invalid_traj')).toBe(false);

    const logLenBefore = store.getState().decisionLog.length;
    expect(store.getState().selectTrajectory('leo_550')).toBe(true);
    expect(store.getState().mission?.trajectoryId).toBe('leo_550');
    expect(store.getState().decisionLog.length).toBe(logLenBefore + 1);
    const lastEntry = store.getState().decisionLog[store.getState().decisionLog.length - 1];
    expect(lastEntry.kind).toBe('trajectory');
    expect(lastEntry.partId).toBe('leo_550');

    expect(store.getState().proceedToLaunchVehicle()).toBe(true);
    expect(store.getState().phase).toBe('LAUNCH_VEHICLE');
  });

  it('gates GO_NO_GO to ROLLOUT on rocket-dependent ERB checks (D11)', () => {
    const store = trajectoryReadyStore();
    store.getState().proceedToLaunchVehicle();

    // Cannot proceed to GO_NO_GO before selecting a rocket
    expect(store.getState().proceedToGoNoGo()).toBe(false);
    expect(store.getState().selectLaunchVehicle('unknown_rocket')).toBe(false);

    // Select lv_light (1,500 kg to LEO — too small for a ~5,000 kg crewed capsule)
    expect(store.getState().selectLaunchVehicle('lv_light')).toBe(true);
    expect(store.getState().vehicleId).toBe('lv_light');
    expect(store.getState().proceedToGoNoGo()).toBe(true);
    expect(store.getState().phase).toBe('GO_NO_GO');

    // ERB-1L Launch Capacity fails -> confirmGoForLaunch is refused!
    expect(store.getState().confirmGoForLaunch()).toBe(false);
    expect(store.getState().phase).toBe('GO_NO_GO');

    // Return to LAUNCH_VEHICLE and select lv_medium (9,500 kg to LEO)
    expect(store.getState().goTo('LAUNCH_VEHICLE')).toBe(true);
    expect(store.getState().selectLaunchVehicle('lv_medium')).toBe(true);
    expect(store.getState().proceedToGoNoGo()).toBe(true);
    expect(store.getState().confirmGoForLaunch()).toBe(true);
    expect(store.getState().phase).toBe('ROLLOUT');
  });

  it('transitions from ROLLOUT to LAUNCH and completes into JOURNEY', () => {
    const store = trajectoryReadyStore();
    store.getState().proceedToLaunchVehicle();
    store.getState().selectLaunchVehicle('lv_medium');
    store.getState().proceedToGoNoGo();
    expect(store.getState().confirmGoForLaunch()).toBe(true);
    expect(store.getState().phase).toBe('ROLLOUT');

    expect(store.getState().startLaunch()).toBe(true);
    expect(store.getState().phase).toBe('LAUNCH');

    const insertionResult = {
      optionId: 'right',
      correct: true,
      explanation: 'Correct!',
      consequence: {},
    };
    expect(
      store.getState().completeLaunch({
        vehicleId: 'lv_medium',
        ignitionStatus: 'clean',
        ignitionBonusDv: 25,
        maxQHandled: true,
        structuralWarning: false,
        peakDynamicPressureKPa: 25.4,
        finalAltitudeKm: 400,
        finalVelocityKms: 7.67,
        deltaVMargin: 120,
        insertionResult,
      }),
    ).toBe(true);

    expect(store.getState().phase).toBe('JOURNEY');
    expect(store.getState().launchResult?.ignitionStatus).toBe('clean');
    expect(store.getState().challengeResults).toHaveLength(1);
    expect(store.getState().challengeResults[0].correct).toBe(true);
    expect(store.getState().journey).not.toBeNull();
    expect(store.getState().journey?.checkpoints[0]?.id).toBe('launch');
  });

  it('steps through JOURNEY into OPERATIONS, handles challenges/events, and finishes to REPORT (P07)', async () => {
    const { journeyChallengeSchedule, liveTelemetry } = await import('../sim/journey');
    const store = trajectoryReadyStore();
    store.getState().proceedToLaunchVehicle();
    store.getState().selectLaunchVehicle('lv_medium');
    store.getState().proceedToGoNoGo();
    store.getState().confirmGoForLaunch();
    store.getState().startLaunch();
    store.getState().completeLaunch({
      vehicleId: 'lv_medium',
      ignitionStatus: 'clean',
      ignitionBonusDv: 25,
      maxQHandled: true,
      structuralWarning: false,
      peakDynamicPressureKPa: 25.4,
      finalAltitudeKm: 400,
      finalVelocityKms: 7.67,
      deltaVMargin: 120,
      insertionResult: null,
    });

    const initialJourney = store.getState().journey!;
    expect(initialJourney).not.toBeNull();
    const telemetry = liveTelemetry(initialJourney);
    expect(telemetry.powerAvailable).toBeGreaterThan(0);
    expect(telemetry.batteryPercent).toBeGreaterThan(0);

    const schedule = journeyChallengeSchedule(initialJourney);
    expect(schedule.length).toBeGreaterThan(0);
    const firstChallenge = schedule[0].challenge;

    // Step to next milestone and answer the scheduled challenge
    store.getState().stepToNextMilestone();
    if (store.getState().journey?.pending) {
      const optId = store.getState().journey!.pending!.options[0].id;
      expect(store.getState().chooseEventOption(optId)).toBe(true);
    }
    expect(store.getState().phase).toBe('OPERATIONS');

    const evalResult = firstChallenge.evaluate(firstChallenge.options[0].id);
    store.getState().completeJourneyChallenge(firstChallenge.id, evalResult);
    expect(store.getState().completedChallengeIds).toContain(firstChallenge.id);

    // Step until mission ends
    for (let guard = 0; guard < 20 && !store.getState().journey?.ended; guard++) {
      if (store.getState().journey?.pending) {
        const optId = store.getState().journey!.pending!.options[0].id;
        store.getState().chooseEventOption(optId);
      }
      store.getState().stepToNextMilestone();
    }

    expect(store.getState().journey?.ended).toBe(true);
    expect(store.getState().journey?.endReason).toBe('complete');
    expect(store.getState().finishJourney()).toBe(true);
    expect(store.getState().phase).toBe('REPORT');
  });
});
