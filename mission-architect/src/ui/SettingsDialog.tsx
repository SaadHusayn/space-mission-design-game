'use client';

import { useEffect, useId } from 'react';

import type { Quality } from '@/game/core/store';
import { useGame } from '@/hooks/useGame';

import { Button } from './Button';

const QUALITY_OPTIONS: { value: Quality; label: string; hint: string }[] = [
  { value: 'high', label: 'High', hint: 'Sharper image, more stars' },
  { value: 'low', label: 'Low', hint: 'Best for older laptops' },
];

interface ToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleRow({ label, description, checked, onChange }: ToggleRowProps) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-line p-3 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent">
      <span>
        <span className="block font-bold text-ink">{label}</span>
        <span className="mt-0.5 block text-sm text-muted">{description}</span>
      </span>
      <input
        type="checkbox"
        role="switch"
        className="peer sr-only"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span
        aria-hidden
        className="relative h-7 w-12 shrink-0 rounded-full border border-line bg-white/10 transition after:absolute after:left-0.5 after:top-0.5 after:h-[22px] after:w-[22px] after:rounded-full after:bg-muted after:transition-transform peer-checked:border-accent peer-checked:bg-accent/30 peer-checked:after:translate-x-5 peer-checked:after:bg-accent"
      />
      <span className="w-8 text-sm font-bold text-muted">{checked ? 'On' : 'Off'}</span>
    </label>
  );
}

/** Settings: graphics quality, audio mixer, and accessibility options. Saved in the browser. */
export function SettingsDialog() {
  const open = useGame((state) => state.settingsOpen);
  const settings = useGame((state) => state.settings);
  const setSetting = useGame((state) => state.setSetting);
  const setSettingsOpen = useGame((state) => state.setSettingsOpen);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSettingsOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, setSettingsOpen]);

  if (!open) return null;

  return (
    <div
      className="pointer-events-auto absolute inset-0 z-20 flex items-center justify-center bg-space/70 p-6 backdrop-blur-sm"
      onClick={() => setSettingsOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="hud-enter max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-line bg-panel p-6 shadow-2xl sm:p-7"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="text-2xl font-bold text-ink">
          Settings
        </h2>

        <fieldset className="mt-6">
          <legend className="text-sm font-semibold uppercase tracking-[0.2em] text-muted">Graphics quality</legend>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {QUALITY_OPTIONS.map((option) => {
              const selected = settings.quality === option.value;
              return (
                <label
                  key={option.value}
                  className={`cursor-pointer rounded-xl border p-3 transition focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent ${
                    selected ? 'border-accent bg-accent/15' : 'border-line hover:border-accent/60'
                  }`}
                >
                  <input
                    type="radio"
                    name="quality"
                    className="sr-only"
                    autoFocus={selected}
                    checked={selected}
                    onChange={() => setSetting('quality', option.value)}
                  />
                  <span className="block font-bold text-ink">
                    {selected ? '● ' : '○ '}
                    {option.label}
                  </span>
                  <span className="mt-1 block text-sm text-muted">{option.hint}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="mt-6 space-y-3">
          <legend className="text-sm font-semibold uppercase tracking-[0.2em] text-muted">Audio</legend>
          <ToggleRow
            label="Mute all audio"
            description="Silence ambient music and sound effects"
            checked={settings.muted}
            onChange={(value) => setSetting('muted', value)}
          />
          <div className="grid gap-3 rounded-xl border border-line p-3 sm:grid-cols-2">
            <label className="block">
              <span className="flex items-center justify-between text-sm font-semibold text-ink">
                <span>Music volume</span>
                <span className="font-mono text-xs text-muted">{Math.round(settings.musicVolume * 100)}%</span>
              </span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(settings.musicVolume * 100)}
                onChange={(event) => setSetting('musicVolume', Number(event.target.value) / 100)}
                className="mt-2 w-full accent-accent"
              />
            </label>
            <label className="block">
              <span className="flex items-center justify-between text-sm font-semibold text-ink">
                <span>SFX volume</span>
                <span className="font-mono text-xs text-muted">{Math.round(settings.sfxVolume * 100)}%</span>
              </span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(settings.sfxVolume * 100)}
                onChange={(event) => setSetting('sfxVolume', Number(event.target.value) / 100)}
                className="mt-2 w-full accent-accent"
              />
            </label>
          </div>
        </fieldset>

        <fieldset className="mt-6 space-y-3">
          <legend className="text-sm font-semibold uppercase tracking-[0.2em] text-muted">Accessibility</legend>
          <ToggleRow
            label="Reduced motion"
            description="Stops camera drift and slows animation"
            checked={settings.reducedMotion}
            onChange={(value) => setSetting('reducedMotion', value)}
          />
          <ToggleRow
            label="Large text mode"
            description="Increases interface font scale for readability"
            checked={settings.largeText}
            onChange={(value) => setSetting('largeText', value)}
          />
          <ToggleRow
            label="High-contrast panels"
            description="Darkens panel backgrounds and sharpens borders"
            checked={settings.highContrast}
            onChange={(value) => setSetting('highContrast', value)}
          />
          <ToggleRow
            label="Subtitles & audio cues"
            description="Shows live captions for audio cues and dialogue"
            checked={settings.subtitles}
            onChange={(value) => setSetting('subtitles', value)}
          />
        </fieldset>

        <div className="mt-7 flex justify-end">
          <Button onClick={() => setSettingsOpen(false)}>DONE</Button>
        </div>
      </div>
    </div>
  );
}
