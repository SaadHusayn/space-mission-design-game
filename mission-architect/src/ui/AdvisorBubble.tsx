'use client';

import type { AdvisorOpinion } from '@/game';

export interface AdvisorBubbleProps {
  opinion: AdvisorOpinion;
  onSelectRecommendation?: (optionId: string) => void;
}

/** Single NPC engineer / mission-control advisor opinion bubble with portrait badge. */
export function AdvisorBubble({ opinion, onSelectRecommendation }: AdvisorBubbleProps) {
  return (
    <div
      className="flex items-start gap-3 rounded-xl border border-line bg-black/40 p-3 backdrop-blur"
      role="article"
      aria-label={`Advisor opinion from ${opinion.speakerName}`}
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-bold shadow"
        style={{ borderColor: opinion.colour, color: opinion.colour, backgroundColor: `${opinion.colour}18` }}
        aria-hidden
      >
        {opinion.initials}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <p className="text-xs font-bold" style={{ color: opinion.colour }}>
            {opinion.speakerName}{' '}
            <span className="font-normal text-muted">· {opinion.speakerTitle}</span>
          </p>
          {onSelectRecommendation ? (
            <button
              type="button"
              onClick={() => onSelectRecommendation(opinion.recommendedOptionId)}
              className="rounded-full border border-accent/50 bg-accent/15 px-2.5 py-0.5 font-mono text-[10px] font-bold text-accent transition hover:bg-accent/30"
            >
              Recommends: {opinion.recommendedOptionLabel}
            </button>
          ) : (
            <span className="rounded-full border border-line bg-white/5 px-2 py-0.5 font-mono text-[10px] text-muted">
              Recommends: <strong className="text-ink">{opinion.recommendedOptionLabel}</strong>
            </span>
          )}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-ink/90">&ldquo;{opinion.quote}&rdquo;</p>
      </div>
    </div>
  );
}
