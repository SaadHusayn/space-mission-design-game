'use client';

import { DIFFICULTIES } from '@/game/data/story';
import { useGame } from '@/hooks/useGame';
import { Button } from '@/ui/Button';
import { CrewBadge } from '@/ui/CrewBadge';
import { MissionPatch } from '@/ui/MissionPatch';

/** Stand-in for the pathway map (Phase 04). Shows the graduated crew. */
export function ChapterSelectPlaceholder() {
  const profile = useGame((state) => state.profile);
  const goTo = useGame((state) => state.goTo);
  const startPrologue = useGame((state) => state.startPrologue);

  return (
    <div className="absolute inset-0 flex items-end justify-center p-4 sm:items-center sm:justify-start sm:p-12">
      <div className="hud-enter pointer-events-auto w-full max-w-lg rounded-2xl border border-line bg-panel p-6 backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-accent">Mission Control</p>
        <div className="mt-3 flex items-center gap-4">
          <MissionPatch patch={profile.patch} size={96} />
          <div>
            <h2 className="text-2xl font-bold text-ink">Crew ready</h2>
            <p className="text-muted">{DIFFICULTIES[profile.difficulty].name} difficulty</p>
          </div>
        </div>
        <ul className="mt-4 space-y-2">
          {profile.crew.map((member) => (
            <li key={member.id}>
              <CrewBadge member={member} />
            </li>
          ))}
        </ul>
        <p className="mt-5 leading-relaxed text-muted">
          The pathway map, with missions to Earth orbit, the Moon, Mars, Jupiter and beyond, arrives in the next build (Phase 04).
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            variant="secondary"
            onClick={() => {
              goTo('TITLE');
              startPrologue('training');
            }}
          >
            REPLAY TRAINING
          </Button>
          <Button variant="secondary" onClick={() => goTo('TITLE')}>
            BACK TO TITLE
          </Button>
        </div>
      </div>
    </div>
  );
}
