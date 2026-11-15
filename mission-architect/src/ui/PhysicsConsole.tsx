'use client';

import { useState } from 'react';

import { soundEngine } from '@/audio/soundEngine';
import type { Challenge, ChallengeResult } from '@/game/challenges/types';
import type { Difficulty } from '@/game/types';

import { Button } from './Button';

interface PhysicsConsoleProps {
  challenge: Challenge;
  difficulty: Difficulty;
  onDone: (result: ChallengeResult) => void;
}

/** A physics question: the player's own numbers, the formula, choices, and an explanation for every answer. */
export function PhysicsConsole({ challenge, difficulty, onDone }: PhysicsConsoleProps) {
  const [result, setResult] = useState<ChallengeResult | null>(null);
  const [showFormula, setShowFormula] = useState(difficulty !== 'director');
  const [showHint, setShowHint] = useState(difficulty === 'cadet');

  return (
    <div className="hud-enter pointer-events-auto rounded-2xl border border-accent/50 bg-panel p-5 backdrop-blur" role="region" aria-label={`Physics challenge: ${challenge.title}`}>
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-accent">Physics console</p>
      <h3 className="mt-1 text-xl font-bold text-ink">{challenge.title}</h3>
      <p className="mt-2 leading-relaxed text-ink/90">{challenge.prompt}</p>

      <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 rounded-xl bg-black/25 p-3 font-mono text-sm sm:grid-cols-2">
        {challenge.givens.map((given) => (
          <div key={given.label} className="flex justify-between gap-3">
            <dt className="text-muted">{given.label}</dt>
            <dd className="text-ink">{given.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        {showFormula ? (
          <p className="rounded-lg border border-line px-3 py-1.5 font-mono text-accent">{challenge.formula}</p>
        ) : (
          <button type="button" className="text-accent underline-offset-4 hover:underline" onClick={() => setShowFormula(true)}>
            Show formula
          </button>
        )}
        {difficulty !== 'director' &&
          (showHint ? (
            <p className="text-muted">Hint: {challenge.workedHint}</p>
          ) : (
            <button type="button" className="text-accent underline-offset-4 hover:underline" onClick={() => setShowHint(true)}>
              Show a worked hint
            </button>
          ))}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2" role="group" aria-label="Answers">
        {challenge.options.map((option) => {
          const chosen = result?.optionId === option.id;
          const reveal = result !== null && challenge.kind === 'single-correct';
          const tone = reveal && option.correct ? 'border-ok bg-ok/10' : chosen ? 'border-warn bg-warn/10' : 'border-line hover:border-accent';
          return (
            <button
              key={option.id}
              type="button"
              disabled={result !== null}
              onClick={() => {
                soundEngine.playSfx('downlink');
                setResult(challenge.evaluate(option.id));
              }}
              className={`rounded-xl border px-4 py-3 text-left font-semibold text-ink transition focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-default ${tone}`}
            >
              {reveal && option.correct ? '✓ ' : chosen && result?.correct === false ? '✗ ' : ''}
              {option.label}
            </button>
          );
        })}
      </div>

      {result && (
        <div className="hud-enter mt-4 rounded-xl border border-line bg-black/25 p-4" aria-live="polite">
          <p className={`font-bold ${result.correct === false ? 'text-warn' : 'text-ok'}`}>
            {result.correct === null ? 'Decision made' : result.correct ? 'Correct' : 'Not quite'}
          </p>
          <p className="mt-1 leading-relaxed text-ink/90">{result.explanation}</p>
          <div className="mt-3 flex justify-end">
            <Button onClick={() => onDone(result)}>CONTINUE</Button>
          </div>
        </div>
      )}
    </div>
  );
}
