import { describe, expect, it } from 'vitest';

import { gameData } from '@/game/data/loadData';
import { createMission } from '@/game/sim/mission';

import { briefingScript } from './briefing';
import { readingTime } from './timeline';

describe('briefing cutscenes', () => {
  it('builds a readable briefing for every pathway with the budget filled in', () => {
    for (const pathway of gameData.pathways) {
      const mission = createMission(pathway.id, undefined, 'cadet');
      const script = briefingScript(mission);
      expect(script.shots.length).toBeGreaterThanOrEqual(3);
      expect(script.shots.every((shot) => shot.set === 'briefing')).toBe(true);
      expect(script.shots[0].caption).toContain(`CHAPTER ${pathway.chapter}`);
      const text = script.shots.map((shot) => shot.line?.text ?? '').join(' ');
      expect(text).not.toContain('{budget}');
      expect(text).toContain(`$${mission.budget.toLocaleString('en-US')}M`);
      for (const shot of script.shots) expect(shot.duration).toBeGreaterThanOrEqual(readingTime(shot.line?.text ?? ''));
    }
  });
});
