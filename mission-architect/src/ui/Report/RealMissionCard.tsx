'use client';

import Link from 'next/link';

import type { RealMissionFact } from '@/game';

interface RealMissionCardProps {
  missions: readonly RealMissionFact[];
}

export function RealMissionCard({ missions }: RealMissionCardProps) {
  return (
    <section
      aria-label="Real Missions Like Yours"
      className="rounded-2xl border border-line bg-panel/90 p-4 backdrop-blur"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
            Historical &amp; Science Context (N7)
          </p>
          <h3 className="text-base font-bold text-ink">Real Missions Like Yours</h3>
        </div>
        <Link
          href="/credits"
          className="text-xs font-semibold text-accent underline-offset-4 hover:underline"
        >
          Sources &amp; Credits ↗
        </Link>
      </div>

      <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
        {missions.map((m) => (
          <article
            key={m.id}
            className="flex flex-col justify-between rounded-xl border border-line bg-space/65 p-3 text-xs"
          >
            <div>
              <div className="flex flex-wrap items-center justify-between gap-1">
                <h4 className="font-bold text-ink">{m.name}</h4>
                <span className="rounded bg-panel px-2 py-0.5 font-mono text-[10px] text-accent">
                  {m.years}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] font-medium text-muted">
                {m.subtitle} · {m.destination}
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-ink">
                <span className="font-semibold text-accent">Real Physics: </span>
                {m.keyPhysics}
              </p>
            </div>
            <p className="mt-2 border-t border-line/60 pt-2 text-[11px] leading-relaxed text-muted">
              <span className="font-semibold text-ink">Mission Parallel: </span>
              {m.parallelToGame}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
