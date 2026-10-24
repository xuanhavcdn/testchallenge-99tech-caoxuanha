/**
 * Every tag a spec may use, so tag names stay consistent and are discoverable.
 * Run a slice with `--grep`, e.g. `npx playwright test --grep "@api.*@cart"`.
 */
export const Tag = {
  // Suite: which layer the test exercises.
  api: '@api',
  e2e: '@e2e',
  performance: '@performance',
  healthcheck: '@healthcheck',

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

export const envNames = ['demo', 'prod'] as const;
export type EnvName = (typeof envNames)[number];

/**
 * Known bug on one environment: the test is skipped there (reported as skipped, with the reason)
 * and still runs everywhere else. Add one per affected environment, e.g. `KnownBug.prod`, and
 * an `issue` annotation naming the defect; remove it once the defect is fixed. See src/fixtures/api.ts.
 * List them all with `npx playwright test --list --grep @known-bug`.
 */
export const KnownBug = Object.fromEntries(envNames.map((name) => [name, `@known-bug-${name}`])) as Record<
  EnvName,
  string
>;
