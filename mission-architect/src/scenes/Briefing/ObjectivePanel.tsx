'use client';

import { PATHWAY_CHALLENGES } from '@/game/challenges/generator';
import { DIFFICULTIES } from '@/game/data/story';
import { missionDays } from '@/game/sim/mission';
import { durationText, missionContract } from '@/game/sim/requirements';
import { useGame } from '@/hooks/useGame';
import { TOPIC_NAMES } from '@/scenes/PathwayMap/PathwayHud';
import { Button } from '@/ui/Button';

import { useCurrentMission } from './BriefingScenes';

const CRITICAL_NAMES: Readonly<Record<string, string>> = {
  mass: 'Mass',
  power: 'Power',
  budget: 'Budget',
  data: 'Data',
  comms: 'Communications',
  time: 'Time',
};

/** The mission contract: what success means, before any design work starts. */
export function ObjectivePanel() {
  const mission = useCurrentMission();
  const difficulty = useGame((state) => state.profile.difficulty);
  const acceptMission = useGame((state) => state.acceptMission);
  const backToMap = useGame((state) => state.backToMap);
  if (!mission) return null;
  const { pathway } = mission;
  const contract = missionContract(mission);

  return (
    <div className="absolute inset-0 overflow-y-auto p-3 sm:p-6">
      <article className="hud-enter pointer-events-auto mx-auto max-w-3xl rounded-2xl border border-line bg-panel p-5 backdrop-blur sm:mr-0 sm:p-7" aria-labelledby="objective-title">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-accent">
          Step 1 · Mission objective · Chapter {pathway.chapter}
        </p>
        <h2 id="objective-title" className="mt-1 text-3xl font-bold text-ink">
          {pathway.name}
        </h2>
        <p className="mt-1 text-muted">
          {pathway.destination} · {pathway.crewed ? `Crewed (${pathway.crewSize} astronauts)` : 'Robotic, flown from mission control'} · {DIFFICULTIES[difficulty].name}
        </p>
        <p className="mt-4 text-lg leading-relaxed text-ink">{pathway.objective}</p>

        <h3 className="mt-6 text-sm font-semibold uppercase tracking-[0.2em] text-muted">Mission requirements</h3>
        <ul className="mt-2 space-y-2">
          {contract.map((item) => (
            <li key={item.id} className="flex gap-3 rounded-xl border border-line bg-black/20 px-3 py-2">
              <span aria-hidden className="text-lg">
                {item.icon}
              </span>
              <span>
                <span className="block font-semibold text-ink">{item.label}</span>
                <span className="block text-sm text-muted">{item.detail}</span>
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <section>
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted">Why this destination is hard</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-ink/90">
              {pathway.hazards.map((hazard) => (
                <li key={hazard}>{hazard}</li>
              ))}
            </ul>
          </section>
          <section>
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted">Watch these resources</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {pathway.critical.map((resource) => (
                <span key={resource} className="rounded-md border border-warn/60 px-2 py-0.5 text-sm text-warn">
                  ★ {CRITICAL_NAMES[resource]}
                </span>
              ))}
            </div>
            <h3 className="mt-4 text-sm font-semibold uppercase tracking-[0.2em] text-muted">Physics you&apos;ll face</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {PATHWAY_CHALLENGES[pathway.id].map((topic) => (
                <span key={topic} className="rounded-md border border-line px-2 py-0.5 text-sm text-ink">
                  {TOPIC_NAMES[topic]}
                </span>
              ))}
            </div>
            <p className="mt-4 text-sm text-muted">
              Default route: {mission.trajectory.name} ({durationText(missionDays(mission.env))}). You&apos;ll compare {pathway.trajectories.length} routes in step 3.
            </p>
          </section>
        </div>

        <div className="mt-7 flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={() => backToMap()}>
            BACK TO MAP
          </Button>
          <Button onClick={() => acceptMission()}>START DESIGN</Button>
        </div>
      </article>
    </div>
  );
}
