import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, type Page } from '@playwright/test';

const SCREENS = path.join(process.cwd(), 'test-results', 'screens');

/** Saves a named screenshot for visual review (test-results/screens/<project>-<name>.png). */
export async function snap(page: Page, name: string, project = 'desktop'): Promise<void> {
  mkdirSync(SCREENS, { recursive: true });
  await page.screenshot({ path: path.join(SCREENS, `${project}-${name}.png`) });
}

/** Collects page errors and console errors so a test can assert there were none. */
export function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  return errors;
}

/** Opens the game with a clean save and waits for the title menu. */
export async function openFresh(page: Page): Promise<void> {
  await page.goto('/play');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByRole('button', { name: 'NEW MISSION' })).toBeVisible();
}

/** Opens the game as a crew that already finished training (optionally with chapter results). */
export async function openGraduated(
  page: Page,
  progress: Record<string, { stars: number; bestScore: number }> = {},
  query = '',
): Promise<void> {
  await page.goto(`/play${query}`);
  await page.evaluate((saved) => {
    const profile = {
      crew: [
        { id: 'p1', callSign: 'Nova', avatar: 0, roles: ['commander', 'science'] },
        { id: 'p2', callSign: 'Comet', avatar: 1, roles: ['engineer', 'comms'] },
      ],
      difficulty: 'engineer',
      patch: { shape: 'shield', symbol: 'orbit', colour: '#7c3aed', motto: 'Per aspera' },
      prologueDone: true,
      seenCutscenes: ['CS-00', 'CS-01', 'CS-02'],
      progress: saved,
    };
    localStorage.setItem(
      'trajectory:settings',
      JSON.stringify({ state: { settings: { quality: 'high', reducedMotion: false }, profile }, version: 2 }),
    );
  }, progress);
  await page.reload();
  await expect(page.getByRole('button', { name: 'CONTINUE' })).toBeVisible();
}

/** Measures frames per second over a short window. */
export async function measureFps(page: Page, ms = 2000): Promise<number> {
  return page.evaluate(
    (duration) =>
      new Promise<number>((resolve) => {
        let frames = 0;
        const start = performance.now();
        const tick = () => {
          frames += 1;
          if (performance.now() - start > duration) resolve(Math.round((frames * 1000) / duration));
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    ms,
  );
}
