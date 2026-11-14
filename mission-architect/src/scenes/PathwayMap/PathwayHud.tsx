'use client';

import { isUnlocked, UNLOCKED_BY } from '@/game/core/progress';
import { PATHWAY_CHALLENGES } from '@/game/challenges/generator';
import { gameData } from '@/game/data/loadData';
import { DIFFICULTIES } from '@/game/data/story';
import { createMission } from '@/game/sim/mission';
import { travelTimeText } from '@/game/sim/requirements';
import { money } from '@/game/sim/format';
import { useGame } from '@/hooks/useGame';
import { Button } from '@/ui/Button';
import { MissionPatch } from '@/ui/MissionPatch';

import { mapStore, unlockAllFromUrl, useMap } from './mapStore';

export const TOPIC_NAMES: Readonly<Record<string, string>> = {
  twr: 'Thrust-to-weight',
  rocketEquation: 'Rocket equation',
  orbitSpeed: 'Orbital speed',
  centripetal: 'Centripetal force',
  artificialGravity: 'Artificial gravity',
  gravityAssist: 'Gravity assist',
  sunlight: 'Inverse-square sunlight',
  signalDelay: 'Light-speed delay',
  transit: 'Transit method',
};

/** Chapter select overlay: details of the focused pathway and the way into its briefing. */
export function PathwayHud() {
  const profile = useGame((state) => state.profile);
  const selectPathway = useGame((state) => state.selectPathway);
  const goTo = useGame((state) => state.goTo);
  const focused = useMap((state) => state.focused);
  const unlockAll = unlockAllFromUrl();
  const pathway = focused ? gameData.pathwayById.get(focused) : null;
  const unlocked = pathway ? isUnlocked(pathway.id, profile.progress, unlockAll) : false;
  const needed = pathway ? UNLOCKED_BY[pathway.id] : null;
  const neededName = needed ? gameData.pathwayById.get(needed)?.name : null;
  const mission = pathway ? createMission(pathway, undefined, profile.difficulty) : null;

  return (
    <div className="absolute inset-0 flex flex-col justify-between p-3 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="hud-enter pointer-events-auto flex items-center gap-3 rounded-2xl border border-line bg-panel px-4 py-2 backdrop-blur">
          <MissionPatch patch={profile.patch} size={48} />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Mission Control</p>
            <p className="text-lg font-bold text-ink">Choose your pathway</p>
            <p className="text-xs text-muted">{DIFFICULTIES[profile.difficulty].name} · Map not to scale</p>
          </div>
        </div>
        <div className="pointer-events-auto flex gap-2">
          {focused && (
            <Button variant="secondary" className="!px-4 !py-2 text-sm" onClick={() => mapStore.getState().focus(null)}>
              OVERVIEW
            </Button>
          )}
          <Button variant="secondary" className="!px-4 !py-2 text-sm" onClick={() => goTo('TITLE')}>
            TITLE
          </Button>
        </div>
      </div>

      {pathway && mission ? (
        <section
          key={pathway.id}
          className="hud-enter pointer-events-auto max-h-[62vh] w-full overflow-y-auto rounded-2xl border border-line bg-panel p-5 backdrop-blur sm:max-w-md"
          aria-label={`${pathway.name} details`}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
            Chapter {pathway.chapter} · {pathway.crewed ? `Crewed · ${pathway.crewSize} astronauts` : 'Robotic'}
          </p>
          <h2 className="mt-1 text-2xl font-bold text-ink">{pathway.name}</h2>
          <p className="text-muted">{pathway.destination}</p>
          <p className="mt-3 leading-relaxed text-ink/90">{pathway.objective}</p>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted">Distance</dt>
            <dd className="text-ink">{pathway.distanceText}</dd>
            <dt className="text-muted">Travel time</dt>
            <dd className="text-ink">{travelTimeText(pathway)}</dd>
            <dt className="text-muted">Budget</dt>
            <dd className="text-ink">{money(mission.budget)}</dd>
            <dt className="text-muted">Best result</dt>
            <dd className="text-warn">{profile.progress[pathway.id] ? `${'★'.repeat(profile.progress[pathway.id]?.stars ?? 0) || '—'} · ${profile.progress[pathway.id]?.bestScore}` : 'Not flown yet'}</dd>
          </dl>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-muted">Physics you&apos;ll face</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {PATHWAY_CHALLENGES[pathway.id].map((topic) => (
              <span key={topic} className="rounded-md border border-line px-2 py-0.5 text-xs text-ink">
                {TOPIC_NAMES[topic]}
              </span>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between gap-3">
            {unlocked ? (
              <Button onClick={() => selectPathway(pathway.id, unlockAll)}>BRIEF ME</Button>
            ) : (
              <p className="text-sm text-warn">
                🔒 Locked. Earn at least one star on <b>{neededName}</b> to open it.
              </p>
            )}
          </div>
        </section>
      ) : (
        <nav className="hud-enter pointer-events-auto w-full rounded-2xl border border-line bg-panel p-4 backdrop-blur sm:max-w-md" aria-label="Chapters">
          <p className="text-sm text-muted">Choose a destination on the map or here. Drag to look around, scroll to zoom. Each chapter unlocks the next.</p>
          <ul className="mt-3 grid grid-cols-2 gap-2">
            {gameData.pathways.map((item) => {
              const open = isUnlocked(item.id, profile.progress, unlockAll);
              const stars = profile.progress[item.id]?.stars ?? 0;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    aria-label={`Select ${item.name}${open ? '' : ' (locked)'}`}
                    onClick={() => mapStore.getState().focus(item.id)}
                    className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition focus-visible:outline-2 focus-visible:outline-accent ${
                      open ? 'border-line text-ink hover:border-accent' : 'border-white/10 text-muted'
                    }`}
                  >
                    <span className="mr-1 font-bold text-accent">{item.chapter}</span>
                    {item.name}
                    {!open && <span aria-hidden> 🔒</span>}
                    {stars > 0 && <span className="text-warn"> {'★'.repeat(stars)}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}
