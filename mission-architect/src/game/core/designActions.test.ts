import { describe, expect, it } from 'vitest';

import { gameData } from '../data/loadData';
import { applyChange, emptyHistory, redoChange, undoChange, HISTORY_LIMIT, type DesignChange } from './designActions';

function change(kind: DesignChange['kind'], extra: Partial<DesignChange> = {}): DesignChange {
  return { kind, ...extra } as DesignChange;
}

/** Equips the first part of a category into its slot (or the bus). */
function firstOf(category: string): string {
  const part = gameData.parts.find((candidate) => candidate.category === category);
  if (!part) throw new Error(`no ${category} in data`);
  return part.id;
}

describe('design actions', () => {
  it('starts with an empty design', () => {
    const history = emptyHistory();
    expect(history.present.busId).toBeNull();
    expect(history.past).toHaveLength(0);
    expect(history.future).toHaveLength(0);
  });

  it('equips a part into its matching slot', () => {
    let history = emptyHistory();
    history = applyChange(history, change('equip', { slot: 'power', partId: 'solar_medium' }));
    expect(history.present.slots.power).toBe('solar_medium');
    expect(history.past).toHaveLength(1);
    expect(history.future).toHaveLength(0);
  });

  it('rejects a part whose category does not match the slot', () => {
    let history = emptyHistory();
    history = applyChange(history, change('equip', { slot: 'power', partId: 'comms_ka' }));
    expect(history.present.slots.power).toBeNull();
    expect(history.past).toHaveLength(0);
  });

  it('rejects unknown part ids', () => {
    const history = applyChange(emptyHistory(), change('equip', { slot: 'power', partId: 'no_such_part' }));
    expect(history.past).toHaveLength(0);
  });

  it('sets the bus and the instruments separately from slots', () => {
    let history = applyChange(emptyHistory(), change('bus', { partId: 'bus_medium' }));
    history = applyChange(history, change('addInstrument', { partId: 'inst_camera' }));
    expect(history.present.busId).toBe('bus_medium');
    expect(history.present.instrumentIds).toEqual(['inst_camera']);
  });

  it('refuses the same instrument twice and removes it cleanly', () => {
    let history = applyChange(emptyHistory(), change('addInstrument', { partId: 'inst_camera' }));
    const doubled = applyChange(history, change('addInstrument', { partId: 'inst_camera' }));
    expect(doubled).toBe(history); // no-op returns the same history
    history = applyChange(history, change('removeInstrument', { partId: 'inst_camera' }));
    expect(history.present.instrumentIds).toEqual([]);
  });

  it('clamps numeric options', () => {
    let history = applyChange(emptyHistory(), change('option', { key: 'fuelMass', value: 999_999 }));
    expect(history.present.options.fuelMass).toBe(200_000);
    history = applyChange(history, change('option', { key: 'fuelMass', value: -50 }));
    expect(history.present.options.fuelMass).toBe(0);
    history = applyChange(history, change('option', { key: 'supplyDays', value: 12.6 }));
    expect(history.present.options.supplyDays).toBe(13);
  });

  it('no-op changes return the same history without a new entry', () => {
    const history = applyChange(emptyHistory(), change('bus', { partId: firstOf('bus') }));
    const again = applyChange(history, change('bus', { partId: firstOf('bus') }));
    expect(again).toBe(history);
    const unequipEmpty = applyChange(history, change('unequip', { slot: 'power' }));
    expect(unequipEmpty).toBe(history);
  });

  it('undoes and redoes changes', () => {
    let history = applyChange(emptyHistory(), change('equip', { slot: 'power', partId: 'solar_small' }));
    history = applyChange(history, change('equip', { slot: 'power', partId: 'solar_medium' }));
    expect(history.present.slots.power).toBe('solar_medium');

    history = undoChange(history);
    expect(history.present.slots.power).toBe('solar_small');
    expect(history.future).toHaveLength(1);

    history = redoChange(history);
    expect(history.present.slots.power).toBe('solar_medium');

    history = undoChange(history);
    history = undoChange(history);
    expect(history.present.slots.power).toBeNull();
    const stuck = undoChange(history);
    expect(stuck).toBe(history); // nothing left to undo
  });

  it('a new change discards the redo branch', () => {
    let history = applyChange(emptyHistory(), change('equip', { slot: 'power', partId: 'solar_small' }));
    history = undoChange(history);
    history = applyChange(history, change('equip', { slot: 'battery', partId: 'battery_medium' }));
    expect(history.future).toHaveLength(0);
    const back = redoChange(history);
    expect(back).toBe(history);
  });

  it('caps the undo history', () => {
    let history = emptyHistory();
    for (let i = 0; i < HISTORY_LIMIT + 10; i++) {
      history = applyChange(history, change('equip', { slot: 'power', partId: i % 2 === 0 ? 'solar_small' : 'solar_medium' }));
    }
    expect(history.past).toHaveLength(HISTORY_LIMIT);
    // The oldest states are dropped, but the present is always correct.
    expect(history.present.slots.power).toBe('solar_medium');
  });
});
