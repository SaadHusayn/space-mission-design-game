import { describe, expect, it } from 'vitest';

import { CUTSCENES } from './scripts';
import { cameraAt, ease, locate, readingTime, shotStarts, totalDuration, type CutsceneScript } from './timeline';

const script: CutsceneScript = {
  id: 'T',
  title: 'test',
  shots: [
    { set: 'orbit', duration: 2, from: [0, 0, 0], to: [10, 0, 0], lookFrom: [0, 0, 0], lookTo: [0, 10, 0] },
    { set: 'hangar', duration: 3, from: [0, 0, 0], to: [0, 0, 6], lookFrom: [0, 0, 0], lookTo: [0, 0, 0] },
  ],
};

describe('cutscene timeline', () => {
  it('adds up durations and start times', () => {
    expect(totalDuration(script)).toBe(5);
    expect(shotStarts(script)).toEqual([0, 2]);
  });

  it('finds the shot playing at a time', () => {
    expect(locate(script, 0)).toMatchObject({ index: 0, progress: 0, done: false });
    expect(locate(script, 1)).toMatchObject({ index: 0, progress: 0.5 });
    expect(locate(script, 2)).toMatchObject({ index: 1, progress: 0 });
    expect(locate(script, 3.5)).toMatchObject({ index: 1, progress: 0.5 });
    expect(locate(script, 5)).toMatchObject({ index: 1, progress: 1, done: true });
    expect(locate(script, -1)).toMatchObject({ index: 0, progress: 0 });
  });

  it('eases smoothly and moves the camera', () => {
    expect(ease(0)).toBe(0);
    expect(ease(0.5)).toBe(0.5);
    expect(ease(1)).toBe(1);
    expect(ease(2)).toBe(1);
    expect(cameraAt(script.shots[0], 1).position).toEqual([10, 0, 0]);
    expect(cameraAt(script.shots[0], 0.5).target).toEqual([0, 5, 0]);
  });

  it('holds the camera still with reduced motion', () => {
    expect(cameraAt(script.shots[0], 0, true).position).toEqual(cameraAt(script.shots[0], 0.9, true).position);
    expect(cameraAt(script.shots[0], 0, true).position).toEqual([5, 0, 0]);
  });

  it('gives every prologue line enough time to read', () => {
    for (const cutscene of Object.values(CUTSCENES)) {
      expect(cutscene.shots.length).toBeGreaterThan(0);
      for (const shot of cutscene.shots) {
        const text = shot.line?.text ?? shot.caption ?? '';
        expect(shot.duration, `${cutscene.id}: ${text}`).toBeGreaterThanOrEqual(readingTime(text) * 0.75);
      }
      expect(totalDuration(cutscene)).toBeLessThanOrEqual(40);
    }
  });
});
