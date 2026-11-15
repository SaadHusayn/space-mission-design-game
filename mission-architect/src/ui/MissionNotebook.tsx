'use client';

import { useEffect, useId, useState } from 'react';

import { NOTEBOOK_CARDS, type NotebookCategory } from '@/game';
import { useGame } from '@/hooks/useGame';

import { Button } from './Button';

const CATEGORIES: readonly ('All' | NotebookCategory)[] = [
  'All',
  'Propulsion',
  'Orbits',
  'Power & Comms',
  'Science',
];

/** Mission Notebook modal: physics formulas, plain-language explanations, and real examples. */
export function MissionNotebook() {
  const open = useGame((state) => state.notebookOpen);
  const setNotebookOpen = useGame((state) => state.setNotebookOpen);
  const [category, setCategory] = useState<'All' | NotebookCategory>('All');
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setNotebookOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, setNotebookOpen]);

  if (!open) return null;

  const cards = category === 'All' ? NOTEBOOK_CARDS : NOTEBOOK_CARDS.filter((c) => c.category === category);

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-space/80 p-4 backdrop-blur-sm sm:p-6"
      onClick={() => setNotebookOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="hud-enter flex max-h-[88vh] w-full max-w-3xl flex-col rounded-2xl border border-line bg-panel p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Engineering Reference</p>
            <h2 id={titleId} className="mt-1 text-2xl font-bold text-ink">
              Mission Notebook
            </h2>
            <p className="mt-1 text-sm text-muted">
              Core spaceflight physics formulas and worked examples used in Mission Architect.
            </p>
          </div>
          <Button variant="secondary" onClick={() => setNotebookOpen(false)} aria-label="Close Mission Notebook">
            Close
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Filter notebook by topic">
          {CATEGORIES.map((cat) => {
            const active = category === cat;
            return (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setCategory(cat)}
                className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-accent ${
                  active
                    ? 'border-accent bg-accent/20 text-ink'
                    : 'border-line bg-white/5 text-muted hover:border-accent/60 hover:text-ink'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        <div className="mt-4 grid flex-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
          {cards.map((card) => (
            <article
              key={card.id}
              className="flex flex-col justify-between rounded-xl border border-line bg-space/70 p-4"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full border border-accent/40 bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent">
                    {card.category}
                  </span>
                  <span className="text-xs text-muted">{card.unlockedIn}</span>
                </div>
                <h3 className="mt-2 text-base font-bold text-ink">{card.title}</h3>
                <p className="mt-2 rounded-lg border border-line/70 bg-white/5 px-3 py-1.5 font-mono text-sm font-semibold text-science">
                  {card.formula}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-ink/90">{card.summary}</p>
              </div>
              <p className="mt-3 border-t border-line/50 pt-2 text-xs leading-relaxed text-muted">
                <strong className="text-ink/80">Example:</strong> {card.example}
              </p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
