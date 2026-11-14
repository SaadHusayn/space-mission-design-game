/**
 * Pure design-editing actions for the spacecraft assembly bay (P05).
 *
 * A change is a small, serialisable description ("equip part X in slot Y").
 * `applyChange` moves a design history forward one step; `undo`/`redo` walk
 * it back and forth. The store only wraps these, so all editing rules are
 * testable in plain Node without React or Three.
 */
import { gameData } from '../data/loadData';
import { SLOT_IDS, emptyDesign, type Design, type SlotId } from '../types';

/** Undo history is capped so a long session can't grow it without bounds. */
export const HISTORY_LIMIT = 50;

/** One edit the player (or a future test) makes to the design. */
export type DesignChange =
  | { kind: 'bus'; partId: string }
  | { kind: 'equip'; slot: SlotId; partId: string }
  | { kind: 'unequip'; slot: SlotId }
  | { kind: 'addInstrument'; partId: string }
  | { kind: 'removeInstrument'; partId: string }
  | { kind: 'option'; key: 'fuelMass' | 'supplyDays' | 'spinArmLength'; value: number };

export interface DesignHistory {
  past: Design[];
  present: Design;
  future: Design[];
}

export function emptyHistory(): DesignHistory {
  return { past: [], present: emptyDesign(), future: [] };
}

function clone(design: Design): Design {
  return {
    busId: design.busId,
    slots: { ...design.slots },
    instrumentIds: [...design.instrumentIds],
    options: { ...design.options },
  };
}

/** Clamps a numeric option to a sane range (0..200 t fuel, 0..2 y supplies, 0..200 m arm). */
function clampOption(key: Extract<DesignChange, { kind: 'option' }>['key'], value: number): number {
  if (!Number.isFinite(value)) return 0;
  const max = key === 'fuelMass' ? 200_000 : key === 'supplyDays' ? 730 : 200;
  return Math.max(0, Math.min(max, Math.round(value)));
}

/** The part's category, or null when the id is unknown. */
function categoryOf(partId: string | null): string | null {
  if (!partId) return null;
  return gameData.partById.get(partId)?.category ?? null;
}

/** Applies one change, returning a new history (the input is never mutated). */
export function applyChange(history: DesignHistory, change: DesignChange): DesignHistory {
  // No-op changes don't create history entries (and no decision-log entry).
  switch (change.kind) {
    case 'bus':
      if (history.present.busId === change.partId) return history;
      break;
    case 'equip':
      if (history.present.slots[change.slot] === change.partId) return history;
      break;
    case 'unequip':
      if (history.present.slots[change.slot] === null) return history;
      break;
    case 'addInstrument':
      if (history.present.instrumentIds.includes(change.partId)) return history;
      break;
    case 'removeInstrument':
      if (!history.present.instrumentIds.includes(change.partId)) return history;
      break;
    case 'option':
      if (history.present.options[change.key] === clampOption(change.key, change.value)) return history;
      break;
  }

  const design = clone(history.present);

  switch (change.kind) {
    case 'bus':
      if (categoryOf(change.partId) !== 'bus') return history;
      design.busId = change.partId;
      break;
    case 'equip': {
      if (!SLOT_IDS.includes(change.slot)) return history;
      if (categoryOf(change.partId) !== change.slot) return history;
      design.slots[change.slot] = change.partId;
      break;
    }
    case 'unequip':
      if (!SLOT_IDS.includes(change.slot)) return history;
      design.slots[change.slot] = null;
      break;
    case 'addInstrument':
      if (categoryOf(change.partId) !== 'instrument') return history;
      design.instrumentIds.push(change.partId);
      break;
    case 'removeInstrument':
      design.instrumentIds = design.instrumentIds.filter((id) => id !== change.partId);
      break;
    case 'option':
      design.options[change.key] = clampOption(change.key, change.value);
      break;
  }

  const past = [...history.past, history.present].slice(-HISTORY_LIMIT);
  return { past, present: design, future: [] };
}

/** Steps back one change. Returns the same history when there is nothing to undo. */
export function undoChange(history: DesignHistory): DesignHistory {
  if (history.past.length === 0) return history;
  const previous = history.past[history.past.length - 1];
  return {
    past: history.past.slice(0, -1),
    present: clone(previous),
    future: [clone(history.present), ...history.future].slice(0, HISTORY_LIMIT),
  };
}

/** Steps forward one change (after an undo). Returns the same history when there is nothing to redo. */
export function redoChange(history: DesignHistory): DesignHistory {
  if (history.future.length === 0) return history;
  const [next, ...rest] = history.future;
  return {
    past: [...history.past, clone(history.present)].slice(-HISTORY_LIMIT),
    present: clone(next),
    future: rest,
  };
}
