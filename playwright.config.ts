import { defineConfig, devices } from '@playwright/test';
import { env } from './config/env';
import { Tag } from './config/tags';

const allBrowsers = [
  { name: 'chromium', device: devices['Desktop Chrome'] },
  { name: 'firefox', device: devices['Desktop Firefox'] },
  { name: 'webkit', device: devices['Desktop Safari'] },
];

// Only the engines in BROWSERS (default chromium) get a project.
const unknown = env.browsers.filter((name) => !allBrowsers.some((b) => b.name === name));
if (unknown.length) {
  throw new Error(
    `BROWSERS has unknown engine(s) ${unknown.join(', ')}; use ${allBrowsers.map((b) => b.name).join(', ')}`,
  );
}
const browsers = allBrowsers.filter((b) => env.browsers.includes(b.name));

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  // Everything a run produces lands in playwright-report/: reports plus failure artefacts.
  outputDir: './playwright-report/test-results',
  // Runs once before all tests (not reported as a test); see config/global-setup.ts.
  globalSetup: './config/global-setup.ts',
  fullyParallel: true,
  forbidOnly: env.isCI,
  // DemoBlaze is a shared public demo backed by a slow API; retry on CI to absorb its flakiness.
  retries: env.isCI ? 2 : 0,
  // WORKER in .env.<ENV> (default 1); the --workers flag still wins.
  workers: env.workers,
  // Only tests tagged with the target environment run (ENV=prod -> @prod), so a test that
  // writes data can't reach prod by accident. Narrow further with --grep, e.g. "@api.*@cart".
  grepInvert: new RegExp(`^(?![\\s\\S]*${Tag[env.name]}\\b)`),
  timeout: env.timeouts.testMs,
  expect: { timeout: env.timeouts.expectMs },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report/html', open: 'never' }],
    ['junit', { outputFile: 'playwright-report/junit.xml' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ...(env.isCI ? [['github'] as ['github']] : []),
  ],
  use: {
    baseURL: env.baseUrl,
    headless: env.headless,
    actionTimeout: env.timeouts.actionMs,
    navigationTimeout: env.timeouts.navigationMs,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    // API tests need no browser, so they run once instead of once per browser.
    { name: 'api', testDir: './tests/api' },

    // UI + E2E suites run on each engine selected by BROWSERS.
    ...browsers.map(({ name, device }) => ({
      name,
      testIgnore: ['api/**', 'performance/**', 'healthcheck/**'],
      use: { ...device },
    })),

    // Performance budgets are measured on a single engine to keep numbers comparable between runs.
    { name: 'performance', testDir: './tests/performance', use: { ...devices['Desktop Chrome'] } },

    // Login health check, run every 30 minutes by .github/workflows/healthcheck.yml. Kept out of the
    // browser projects above so regular runs don't repeat it.
    { name: 'healthcheck', testDir: './tests/healthcheck', use: { ...devices['Desktop Chrome'] } },
  ],
});
