'use client';

import { PATCH_COLOURS, PATCH_SHAPES, PATCH_SYMBOLS, type MissionPatch as Patch } from '@/game/core/patch';

import { MissionPatch } from './MissionPatch';

interface PatchMakerProps {
  patch: Patch;
  onChange: (patch: Patch) => void;
}

function Choice({ label, selected, onClick, children }: { label: string; selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={label}
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 text-sm font-semibold capitalize transition focus-visible:outline-2 focus-visible:outline-accent ${
        selected ? 'border-accent bg-accent/15 text-ink' : 'border-line text-muted hover:border-accent/60'
      }`}
    >
      {children}
    </button>
  );
}

/** Design the crew's mission patch. */
export function PatchMaker({ patch, onChange }: PatchMakerProps) {
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
      <MissionPatch patch={patch} size={150} />
      <div className="w-full space-y-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">Shape</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {PATCH_SHAPES.map((shape) => (
              <Choice key={shape} label={`Shape ${shape}`} selected={patch.shape === shape} onClick={() => onChange({ ...patch, shape })}>
                {shape}
              </Choice>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">Symbol</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {PATCH_SYMBOLS.map((symbol) => (
              <Choice key={symbol} label={`Symbol ${symbol}`} selected={patch.symbol === symbol} onClick={() => onChange({ ...patch, symbol })}>
                {symbol}
              </Choice>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">Colour</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {PATCH_COLOURS.map((colour) => (
              <button
                key={colour}
                type="button"
                aria-pressed={patch.colour === colour}
                aria-label={`Colour ${colour}`}
                onClick={() => onChange({ ...patch, colour })}
                className={`h-8 w-8 rounded-full border-2 transition focus-visible:outline-2 focus-visible:outline-accent ${patch.colour === colour ? 'scale-110 border-accent' : 'border-white/30'}`}
                style={{ background: colour }}
              />
            ))}
          </div>
        </div>
        <label className="block">
          <span className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">Motto</span>
          <input
            value={patch.motto}
            maxLength={24}
            onChange={(event) => onChange({ ...patch, motto: event.target.value })}
            className="mt-1 w-full rounded-lg border border-line bg-black/30 px-3 py-2 text-ink outline-none focus:border-accent"
          />
        </label>
      </div>
    </div>
  );
}
