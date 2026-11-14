'use client';

import { useId, useMemo, useState } from 'react';

import { AVATAR_COLOURS, MAX_CREW, ROLES, createCrew, isCrewValid, normaliseCallSign, rotateRoles, validateCallSign, type CrewMember } from '@/game/core/crew';
import { DIFFICULTIES } from '@/game/data/story';
import type { Difficulty } from '@/game/types';
import { useGame } from '@/hooks/useGame';

import { Button } from './Button';

const SUGGESTIONS = ['Nova', 'Comet', 'Vega', 'Orbit'];

/** Crew file: number of players, call-signs, suit colours, roles and difficulty. */
export function CrewSetup() {
  const profile = useGame((state) => state.profile);
  const setCrew = useGame((state) => state.setCrew);
  const setDifficulty = useGame((state) => state.setDifficulty);
  const advancePrologue = useGame((state) => state.advancePrologue);
  const [crew, setLocalCrew] = useState<CrewMember[]>(() =>
    profile.crew.length > 0 && profile.crew.some((member) => member.callSign) ? profile.crew : createCrew(1, [SUGGESTIONS[0]]),
  );
  const [difficulty, setLocalDifficulty] = useState<Difficulty>(profile.difficulty);
  const formId = useId();

  const errors = useMemo(
    () =>
      crew.map((member, index) =>
        validateCallSign(
          member.callSign,
          crew.filter((_, other) => other !== index).map((other) => other.callSign),
        ),
      ),
    [crew],
  );
  const valid = isCrewValid(crew);

  const resize = (count: number) => {
    const names = crew.map((member) => member.callSign);
    const fresh = createCrew(count, Array.from({ length: count }, (_, i) => names[i] ?? SUGGESTIONS[i]));
    setLocalCrew(fresh.map((member, i) => ({ ...member, avatar: crew[i]?.avatar ?? member.avatar })));
  };

  const update = (index: number, change: Partial<CrewMember>) =>
    setLocalCrew((current) => current.map((member, i) => (i === index ? { ...member, ...change } : member)));

  const confirm = () => {
    if (!valid) return;
    setCrew(crew.map((member) => ({ ...member, callSign: normaliseCallSign(member.callSign) })));
    setDifficulty(difficulty);
    advancePrologue();
  };

  return (
    <div className="absolute inset-0 overflow-y-auto p-4 sm:p-8">
      <form
        className="hud-enter pointer-events-auto mx-auto max-w-4xl rounded-2xl border border-line bg-panel p-5 backdrop-blur sm:p-7"
        aria-labelledby={`${formId}-title`}
        onSubmit={(event) => {
          event.preventDefault();
          confirm();
        }}
      >
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-accent">Candidate file</p>
        <h2 id={`${formId}-title`} className="mt-1 text-2xl font-bold text-ink sm:text-3xl">
          Who is in your astronaut class?
        </h2>
        <p className="mt-2 text-muted">
          Play solo, or as a team of up to {MAX_CREW} sharing this screen. Every role must be covered, so with fewer players some astronauts hold two
          roles. Use call-signs only, never real names.
        </p>

        <fieldset className="mt-5">
          <legend className="text-sm font-semibold uppercase tracking-[0.2em] text-muted">Players</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {[1, 2, 3, 4].map((count) => (
              <button
                key={count}
                type="button"
                aria-pressed={crew.length === count}
                onClick={() => resize(count)}
                className={`rounded-full border px-5 py-2 font-bold transition focus-visible:outline-2 focus-visible:outline-accent ${
                  crew.length === count ? 'border-accent bg-accent/15 text-ink' : 'border-line text-muted hover:border-accent/60'
                }`}
              >
                {count === 1 ? 'Solo' : `${count} players`}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {crew.map((member, index) => (
            <div key={member.id} className="rounded-xl border border-line p-4">
              <label className="block text-sm font-semibold text-muted" htmlFor={`${formId}-name-${index}`}>
                Player {index + 1} call-sign
              </label>
              <input
                id={`${formId}-name-${index}`}
                value={member.callSign}
                maxLength={16}
                autoComplete="off"
                aria-invalid={errors[index] !== null}
                aria-describedby={`${formId}-err-${index}`}
                onChange={(event) => update(index, { callSign: event.target.value })}
                className="mt-1 w-full rounded-lg border border-line bg-black/30 px-3 py-2 text-lg text-ink outline-none focus:border-accent"
              />
              <p id={`${formId}-err-${index}`} className="mt-1 min-h-5 text-sm text-warn">
                {errors[index] ?? ''}
              </p>
              <div className="mt-1 flex items-center gap-2" role="radiogroup" aria-label={`Player ${index + 1} suit colour`}>
                {AVATAR_COLOURS.map((colour, avatar) => (
                  <button
                    key={colour}
                    type="button"
                    role="radio"
                    aria-checked={member.avatar === avatar}
                    aria-label={`Suit colour ${avatar + 1}`}
                    onClick={() => update(index, { avatar })}
                    className={`h-7 w-7 rounded-full border-2 transition focus-visible:outline-2 focus-visible:outline-accent ${member.avatar === avatar ? 'scale-110 border-accent' : 'border-white/30'}`}
                    style={{ background: colour }}
                  />
                ))}
              </div>
              <ul className="mt-3 space-y-1.5">
                {member.roles.map((role) => (
                  <li key={role} className="text-sm">
                    <span className="font-bold" style={{ color: ROLES[role].colour }}>
                      {ROLES[role].name}
                    </span>
                    <span className="text-muted">: {ROLES[role].duties}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {crew.length > 1 && (
          <button
            type="button"
            onClick={() => setLocalCrew(rotateRoles(crew))}
            className="mt-3 text-sm font-semibold text-accent underline-offset-4 hover:underline"
          >
            ⟳ Swap roles between players
          </button>
        )}

        <fieldset className="mt-6">
          <legend className="text-sm font-semibold uppercase tracking-[0.2em] text-muted">Difficulty</legend>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            {(Object.keys(DIFFICULTIES) as Difficulty[]).map((id) => (
              <label
                key={id}
                className={`cursor-pointer rounded-xl border p-3 transition focus-within:outline-2 focus-within:outline-accent ${
                  difficulty === id ? 'border-accent bg-accent/15' : 'border-line hover:border-accent/60'
                }`}
              >
                <input type="radio" name="difficulty" className="sr-only" checked={difficulty === id} onChange={() => setLocalDifficulty(id)} />
                <span className="block font-bold text-ink">
                  {difficulty === id ? '● ' : '○ '}
                  {DIFFICULTIES[id].name}
                </span>
                <span className="mt-1 block text-sm text-muted">{DIFFICULTIES[id].summary}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-6 flex items-center justify-end gap-4">
          {!valid && <p className="text-sm text-warn">Give every player a unique call-sign to continue.</p>}
          <Button type="submit" disabled={!valid}>
            BEGIN SELECTION
          </Button>
        </div>
      </form>
    </div>
  );
}
