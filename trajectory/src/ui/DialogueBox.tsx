import type { ReactNode } from 'react';

import { SPEAKERS, type SpeakerId } from '@/game/data/story';

interface DialogueBoxProps {
  speaker: SpeakerId;
  text: string;
  children?: ReactNode;
}

/** A character speaking: portrait, name, line, and optional actions. */
export function DialogueBox({ speaker, text, children }: DialogueBoxProps) {
  const who = SPEAKERS[speaker];
  return (
    <div className="hud-enter pointer-events-auto rounded-2xl border border-line bg-panel p-5 backdrop-blur" role="region" aria-label={`${who.name} says`}>
      <div className="flex items-start gap-4">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold"
          style={{ borderColor: who.colour, color: who.colour }}
          aria-hidden
        >
          {who.initials}
        </span>
        <div className="min-w-0">
          <p className="font-bold" style={{ color: who.colour }}>
            {who.name} <span className="ml-1 text-sm font-medium text-muted">· {who.title}</span>
          </p>
          <p className="mt-1.5 text-base leading-relaxed text-ink sm:text-lg">{text}</p>
        </div>
      </div>
      {children && <div className="mt-4 flex flex-wrap items-center justify-end gap-3">{children}</div>}
    </div>
  );
}
