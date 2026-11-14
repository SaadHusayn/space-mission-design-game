/**
 * Cutscene timelines: data plus pure maths (no React, no Three), so the
 * timing logic can be tested in Node.
 */
import type { Line } from '@/game/data/story';

export type Vec3 = readonly [number, number, number];

/** 3D sets a cutscene shot can show. */
export type SetId = 'launchpad' | 'orbit' | 'message' | 'centrifuge' | 'simulator' | 'pool' | 'hangar';

export interface CutsceneShot {
  set: SetId;
  /** Seconds. */
  duration: number;
  /** Camera position at the start and end of the shot. */
  from: Vec3;
  to: Vec3;
  /** Point the camera looks at, at the start and end of the shot. */
  lookFrom: Vec3;
  lookTo: Vec3;
  /** Subtitle / dialogue shown during the shot. */
  line?: Line;
  /** Optional big caption (title cards). */
  caption?: string;
}

export interface CutsceneScript {
  id: string;
  title: string;
  shots: readonly CutsceneShot[];
}

export function totalDuration(script: CutsceneScript): number {
  return script.shots.reduce((sum, shot) => sum + shot.duration, 0);
}

/** Start time of each shot. */
export function shotStarts(script: CutsceneScript): number[] {
  const starts: number[] = [];
  let time = 0;
  for (const shot of script.shots) {
    starts.push(time);
    time += shot.duration;
  }
  return starts;
}

export interface Located {
  index: number;
  shot: CutsceneShot;
  /** Progress through the shot, 0..1. */
  progress: number;
  done: boolean;
}

/** Which shot is playing at time `t` (seconds). */
export function locate(script: CutsceneScript, t: number): Located {
  if (script.shots.length === 0) throw new Error(`Cutscene ${script.id} has no shots`);
  const starts = shotStarts(script);
  const total = totalDuration(script);
  if (t >= total) {
    const index = script.shots.length - 1;
    return { index, shot: script.shots[index], progress: 1, done: true };
  }
  const time = Math.max(0, t);
  let index = 0;
  for (let i = 0; i < starts.length; i++) if (time >= starts[i]) index = i;
  const shot = script.shots[index];
  return { index, shot, progress: shot.duration > 0 ? (time - starts[index]) / shot.duration : 1, done: false };
}

/** Smooth start and end (smoothstep). */
export function ease(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

function mix(a: Vec3, b: Vec3, t: number): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/**
 * Camera position and target for a shot. With reduced motion the camera
 * holds still at the middle of its move instead of travelling.
 */
export function cameraAt(shot: CutsceneShot, progress: number, reducedMotion = false): { position: [number, number, number]; target: [number, number, number] } {
  const t = reducedMotion ? 0.5 : ease(progress);
  return { position: mix(shot.from, shot.to, t), target: mix(shot.lookFrom, shot.lookTo, t) };
}

/** Reading time for a line: about 0.3 s per word, at least 2.5 s. */
export function readingTime(text: string): number {
  return Math.max(2.5, text.trim().split(/\s+/).length * 0.3);
}
