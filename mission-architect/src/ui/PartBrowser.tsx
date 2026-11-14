'use client';

import { incompatibilityReason, partsByCategory, type DesignChange } from '@/game';
import type { Design, MissionContext, Part, PartCategory, SlotId } from '@/game/types';
import type { AssemblyTarget } from '@/scenes/Hangar/assemblyStore';

import { PartCard } from './PartCard';
import { SLOT_LABELS } from './SlotList';

function categoryForTarget(target: AssemblyTarget): PartCategory {
  if (target === 'bus') return 'bus';
  if (target === 'instruments') return 'instrument';
  return target as PartCategory;
}

export interface PartBrowserProps {
  selectedTarget: AssemblyTarget;
  design: Design;
  mission: MissionContext;
  onEdit: (change: DesignChange) => void;
}

export function PartBrowser({
  selectedTarget,
  design,
  mission,
  onEdit,
}: PartBrowserProps) {
  const category = categoryForTarget(selectedTarget);
  const parts = partsByCategory(category) as Part[];

  const isEquipped = (part: Part): boolean => {
    if (selectedTarget === 'bus') return design.busId === part.id;
    if (selectedTarget === 'instruments') return design.instrumentIds.includes(part.id);
    return design.slots[selectedTarget as SlotId] === part.id;
  };

  const handleAction = (part: Part) => {
    const equipped = isEquipped(part);
    if (selectedTarget === 'bus') {
      if (!equipped) onEdit({ kind: 'bus', partId: part.id });
      return;
    }
    if (selectedTarget === 'instruments') {
      if (equipped) {
        onEdit({ kind: 'removeInstrument', partId: part.id });
      } else {
        onEdit({ kind: 'addInstrument', partId: part.id });
      }
      return;
    }
    const slot = selectedTarget as SlotId;
    if (equipped) {
      onEdit({ kind: 'unequip', slot });
    } else {
      onEdit({ kind: 'equip', slot, partId: part.id });
    }
  };

  return (
    <section
      className="pointer-events-auto rounded-2xl border border-line bg-panel p-4 backdrop-blur"
      aria-label={`Part browser: ${SLOT_LABELS[selectedTarget]}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Part Catalog</p>
          <h3 className="text-lg font-bold text-ink">{SLOT_LABELS[selectedTarget]}</h3>
        </div>
        <p className="text-xs text-muted">
          {selectedTarget === 'instruments'
            ? `Required: ${mission.pathway.requiredInstruments.map((g) => g.join(' or ')).join(' + ')}`
            : 'All tiers unlocked · Choose the best engineering trade-off'}
        </p>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {parts.map((part) => {
          const equipped = isEquipped(part);
          const reason = equipped ? null : incompatibilityReason(part, mission, design);
          return (
            <PartCard
              key={part.id}
              part={part}
              mission={mission}
              equipped={equipped}
              incompatibleReason={reason}
              onAction={() => handleAction(part)}
            />
          );
        })}
      </div>
    </section>
  );
}
