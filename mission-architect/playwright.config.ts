import { defineConfig, devices } from '@playwright/test';

const PORT = 3311;
const CI = !!process.env.CI;

/**
 * Browser tests. They run against the production build:
 *   npm run test:e2e        (builds, then tests)
 *   npx playwright test     (tests only, reusing an existing build/server)
 * Screenshots of every step go to test-results/screens/.
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 180_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  outputDir: 'test-results/artifacts',
  use: {
    baseURL: `http://localhost:${PORT}`,
    // Uses the installed Google Chrome, so no extra browser download is needed.
    channel: 'chrome',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    // Real GPU locally for realistic frame rates (D3D11 on Windows, GL on Linux); CI machines use software rendering.
    launchOptions: CI
      ? {}
      : {
          args: [
            '--enable-gpu',
            '--ignore-gpu-blocklist',
            ...(process.platform === 'linux' ? ['--use-angle=gl'] : []),
          ],
        },
  },
  webServer: {
    command: `npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}/play`,
    reuseExistingServer: !CI,
    timeout: 120_000,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1600, height: 900 } }, grepInvert: /@phone/ },
    { name: 'phone', use: { channel: 'chrome', viewport: { width: 420, height: 860 }, hasTouch: true }, grep: /@phone/ },
  ],
});
