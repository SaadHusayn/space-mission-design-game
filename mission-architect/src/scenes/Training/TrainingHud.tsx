'use client';

import { useMemo } from 'react';

import { useGame } from '@/hooks/useGame';
import { Button } from '@/ui/Button';
import { DialogueBox } from '@/ui/DialogueBox';
import { PhysicsConsole } from '@/ui/PhysicsConsole';
import { ResourcePanel } from '@/ui/ResourcePanel';

import { TRAINING_STEPS } from './steps';
import { trainingChallenge, trainingSetup } from './trainingMission';
import { partInfoFor, taskDone, trainingStore, useTraining } from './trainingStore';

/** The training overlay: instructor dialogue, the current task, and the tools it needs. */
export function TrainingHud() {
  const difficulty = useGame((state) => state.profile.difficulty);
  const advancePrologue = useGame((state) => state.advancePrologue);
  const step = useTraining((state) => state.step);
  const selected = useTraining((state) => state.selected);
  const swapped = useTraining((state) => state.swapped);
  const done = useTraining(taskDone);
  const current = TRAINING_STEPS[step];
  const last = step === TRAINING_STEPS.length - 1;

  const before = useMemo(() => trainingSetup(difficulty, false), [difficulty]);
  const after = useMemo(() => trainingSetup(difficulty, true), [difficulty]);
  const challenge = useMemo(() => trainingChallenge(difficulty), [difficulty]);
  const info = selected ? partInfoFor(selected) : null;
  const showResources = current.task === 'swap' || current.id === 'tradeoff';

  return (
    <div className="absolute inset-0 flex flex-col justify-between gap-3 p-3 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="pointer-events-auto rounded-xl border border-line bg-panel px-4 py-2 backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Astronaut training</p>
          <p className="text-sm text-muted">
            Step {step + 1} of {TRAINING_STEPS.length}
          </p>
        </div>
        <button
          type="button"
          onClick={() => advancePrologue()}
          className="pointer-events-auto rounded-full border border-line bg-panel px-4 py-1.5 text-sm font-semibold tracking-[0.12em] text-muted transition hover:border-accent hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
        >
          SKIP TRAINING
        </button>
      </div>

      <div className="flex min-h-0 flex-1 items-start justify-end gap-3 overflow-y-auto">
        <div className="flex w-full max-w-md flex-col gap-3">
          {info && (current.task === 'select' || step > 2) && current.task !== 'challenge' && (
            <div className="hud-enter pointer-events-auto rounded-2xl border border-line bg-panel p-4 backdrop-blur" aria-live="polite">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">{info.system}</p>
              <p className="mt-0.5 text-lg font-bold text-ink">{info.name}</p>
              <p className="mt-1 text-muted">{info.text}</p>
            </div>
          )}
          {showResources && (
            <div className="hud-enter pointer-events-auto flex flex-col gap-3">
              <ResourcePanel
                summary={swapped ? after.summary : before.summary}
                mission={before.mission}
                before={swapped ? before.summary : undefined}
                title="Test mission resources"
              />
              {current.task === 'swap' && (
                <Button onClick={() => trainingStore.getState().setSwapped(!swapped)}>
                  {swapped ? 'REFIT THE SMALLER ARRAY' : 'FIT BIGGER SOLAR ARRAY'}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
        {current.task === 'challenge' && !done && (
          <PhysicsConsole challenge={challenge} difficulty={difficulty} onDone={() => trainingStore.getState().markAnswered()} />
        )}
        <DialogueBox speaker={current.speaker} text={current.text}>
          {current.taskLabel && (
            <span className={`mr-auto text-sm font-semibold ${done ? 'text-ok' : 'text-warn'}`}>
              {done ? '✓' : '○'} {current.taskLabel}
            </span>
          )}
          {last ? (
            <Button onClick={() => advancePrologue()}>GRADUATE</Button>
          ) : (
            <Button disabled={!done} onClick={() => trainingStore.getState().next()}>
              NEXT
            </Button>
          )}
        </DialogueBox>
      </div>
    </div>
  );
}
