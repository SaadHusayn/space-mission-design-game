'use client';

import { AVATAR_COLOURS } from '@/game/core/crew';
import type { CrewAward } from '@/game';

interface CrewAwardsProps {
  awards: readonly CrewAward[];
}

export function CrewAwards({ awards }: CrewAwardsProps) {
  return (
    <section
      aria-label="Crew Commendations and Awards"
      className="rounded-2xl border border-line bg-panel/90 p-4 backdrop-blur"
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
            Flight Debrief Commendations
          </p>
          <h3 className="text-base font-bold text-ink">Crew Awards</h3>
        </div>
        <span className="text-[11px] text-muted">Role highlights from this mission</span>
      </div>

      <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
        {awards.map((award) => {
          const colour = AVATAR_COLOURS[award.avatar % AVATAR_COLOURS.length] ?? '#5ce1ff';
          return (
            <article
              key={award.id}
              className="flex items-start gap-3 rounded-xl border border-line bg-space/65 p-3"
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-lg"
                style={{ borderColor: colour, backgroundColor: `${colour}22` }}
                aria-hidden
              >
                {award.badge}
              </div>
              <div className="min-w-0 flex-1 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <span className="font-bold text-ink">{award.title}</span>
                  <span
                    className="rounded-full px-2 py-0.5 font-mono text-[10px] font-bold"
                    style={{ color: colour, backgroundColor: `${colour}20` }}
                  >
                    {award.recipientCallSign}
                  </span>
                </div>
                <p className="text-[10px] uppercase tracking-wider text-muted">
                  {award.recipientRole}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-ink/90">
                  {award.reason}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
