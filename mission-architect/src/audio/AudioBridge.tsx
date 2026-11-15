'use client';

import { useEffect, useRef, useState } from 'react';

import { scoreMission } from '@/game';
import { useGame } from '@/hooks/useGame';

import { soundEngine, type MusicMode } from './soundEngine';

function deriveMusicMode(
  phase: string,
  hasActiveEvent: boolean,
  isSuccessReport: boolean | null,
): MusicMode {
  if (phase === 'BOOT') return 'silent';
  if (hasActiveEvent || phase === 'ROLLOUT' || phase === 'LAUNCH') return 'tension';
  if (phase === 'JOURNEY' || phase === 'OPERATIONS') return 'cruise';
  if (phase === 'REPORT') {
    if (isSuccessReport === true) return 'success';
    if (isSuccessReport === false) return 'failure';
    return 'cruise';
  }
  return 'menu';
}

/**
 * Connects game state & settings to the procedural Web Audio engine and renders
 * optional accessible audio-cue subtitles.
 */
export function AudioBridge() {
  const phase = useGame((state) => state.phase);
  const settings = useGame((state) => state.settings);
  const journey = useGame((state) => state.journey);
  const decisionLog = useGame((state) => state.decisionLog);

  const [cueText, setCueText] = useState<string | null>(null);
  const cueTimer = useRef<number | null>(null);
  const prevPhase = useRef(phase);
  const prevDecisionCount = useRef(decisionLog.length);
  const prevEventId = useRef<string | null>(null);

  // Unlock Web Audio on first user interaction
  useEffect(() => {
    const unlock = () => soundEngine.unlock();
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  // Sync mixer volumes & mute
  useEffect(() => {
    soundEngine.configure({
      musicVolume: settings.musicVolume,
      sfxVolume: settings.sfxVolume,
      muted: settings.muted,
    });
  }, [settings.musicVolume, settings.sfxVolume, settings.muted]);

  // Subscribe to audio cue captions for accessibility subtitles
  useEffect(() => {
    return soundEngine.onCue((caption) => {
      setCueText(caption);
      if (cueTimer.current !== null) window.clearTimeout(cueTimer.current);
      cueTimer.current = window.setTimeout(() => {
        setCueText(null);
      }, 2200);
    });
  }, []);

  // Compute whether report is success when in REPORT phase
  let isSuccessReport: boolean | null = null;
  if (phase === 'REPORT' && journey) {
    const score = scoreMission(journey);
    isSuccessReport = score.outcome === 'success' || score.outcome === 'partial';
  }

  // Update ambient music mode
  useEffect(() => {
    const mode = deriveMusicMode(phase, Boolean(journey?.pending), isSuccessReport);
    soundEngine.setMusicMode(mode);
  }, [phase, journey?.pending, isSuccessReport]);

  // Play phase-transition SFX
  useEffect(() => {
    if (prevPhase.current !== phase) {
      if (phase === 'LAUNCH') {
        soundEngine.playSfx('ignition');
      } else if (phase === 'REPORT') {
        if (isSuccessReport) soundEngine.playSfx('fanfare');
        else soundEngine.playSfx('downlink');
      }
      prevPhase.current = phase;
    }
  }, [phase, isSuccessReport]);

  // Play snap SFX when a design change is logged in ASSEMBLY
  useEffect(() => {
    if (phase === 'ASSEMBLY' && decisionLog.length > prevDecisionCount.current) {
      soundEngine.playSfx('snap');
    }
    prevDecisionCount.current = decisionLog.length;
  }, [phase, decisionLog.length]);

  // Play alarm SFX when an in-flight event triggers
  useEffect(() => {
    const activeId = journey?.pending?.eventId ?? null;
    if (activeId && activeId !== prevEventId.current) {
      soundEngine.playSfx('alarm');
    }
    prevEventId.current = activeId;
  }, [journey?.pending?.eventId]);

  if (!settings.subtitles || !cueText) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-full border border-line bg-panel px-4 py-1.5 text-xs font-medium tracking-wide text-ink shadow-lg backdrop-blur"
    >
      <span aria-hidden className="mr-1.5 text-accent">
        ♪
      </span>
      [{cueText}]
    </div>
  );
}
