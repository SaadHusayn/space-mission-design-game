'use client';

import { useState } from 'react';

import { DIFFICULTIES } from '@/game/data/story';
import { useGame } from '@/hooks/useGame';
import { Button } from '@/ui/Button';
import { CrewBadge } from '@/ui/CrewBadge';
import { PatchMaker } from '@/ui/PatchMaker';

/** Graduation: the crew designs its patch, then heads to Mission Control. */
export function GraduationPanel() {
  const profile = useGame((state) => state.profile);
  const setPatch = useGame((state) => state.setPatch);
  const advancePrologue = useGame((state) => state.advancePrologue);
  const [patch, setLocalPatch] = useState(profile.patch);

  return (
    <div className="absolute inset-0 overflow-y-auto p-4 sm:p-8">
      <div className="hud-enter pointer-events-auto mx-auto max-w-3xl rounded-2xl border border-line bg-panel p-5 backdrop-blur sm:p-7">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-accent">Graduation</p>
        <h2 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">Welcome to the astronaut class</h2>
        <p className="mt-2 text-muted">Every crew flies with its own patch. Design yours.</p>
        <div className="mt-5">
          <PatchMaker patch={patch} onChange={setLocalPatch} />
        </div>
        <div className="mt-6 rounded-xl border border-line p-4">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted">
            Crew · {DIFFICULTIES[profile.difficulty].name}
          </p>
          <ul className="mt-2 space-y-2">
            {profile.crew.map((member) => (
              <li key={member.id}>
                <CrewBadge member={member} />
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-6 flex justify-end">
          <Button
            onClick={() => {
              setPatch(patch);
              advancePrologue();
            }}
          >
            GO TO MISSION CONTROL
          </Button>
        </div>
      </div>
    </div>
  );
}
