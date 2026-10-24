/**
 * Every tag a spec may use, so tag names stay consistent and are discoverable.
 * Run a slice with `--grep`, e.g. `npx playwright test --grep "@api.*@cart"`.
 */
export const Tag = {
  // Suite: which layer the test exercises.
  api: '@api',
  e2e: '@e2e',
  performance: '@performance',

  // Scope: how critical the test is.
  smoke: '@smoke',
  regression: '@regression',

  // Function: the feature under test.
  login: '@login',
  product: '@product',
  cart: '@cart',
  order: '@order',

  // Environment: where the test is allowed to run (see playwright.config.ts).
  // Every test runs on demo; only read-only tests that leave no data behind run on prod.
  demo: '@demo',
  prod: '@prod',
} as const;

export type EnvName = 'demo' | 'prod';
export const envNames: readonly EnvName[] = ['demo', 'prod'];
