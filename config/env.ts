import dotenv from 'dotenv';
import path from 'path';
import { envNames, type EnvName } from './tags';

/**
 * Central, typed access to runtime configuration.
 *
 * `ENV` (default `demo`) picks the environment file: `.env.demo` or `.env.prod`.
 * Precedence (highest first):
 *   1. Real environment variables (CI secrets, `KEY=value npx playwright test`)
 *   2. `.env.<ENV>`
 *   3. The defaults below, so a missing file or variable still gives a working run
 *
 * dotenv never overrides a variable that is already set.
 */
const root = path.resolve(__dirname, '..');
const envName = (process.env.ENV || 'demo') as EnvName;
if (!envNames.includes(envName)) {
  throw new Error(`ENV must be one of ${envNames.join(', ')}, got "${envName}"`);
}
dotenv.config({ path: path.join(root, `.env.${envName}`), quiet: true });

function number(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (Number.isNaN(value)) throw new Error(`Environment variable ${name} must be a number, got "${raw}"`);
  return value;
}

/** `WORKER=1` (a count) or `WORKER=50%` (a share of CPU cores). */
function workers(fallback: number): number | string {
  const raw = process.env.WORKER;
  return raw?.endsWith('%') ? raw : number('WORKER', fallback);
}

export const env = {
  name: envName,
  baseUrl: process.env.BASE_URL || 'https://www.demoblaze.com',
  apiUrl: process.env.API_URL || 'https://api.demoblaze.com',
  isCI: !!process.env.CI,
  headless: process.env.HEADLESS !== 'false',
  workers: workers(1),
  /** Browser projects to define, e.g. `BROWSERS=chromium,firefox,webkit` (comma or space separated). */
  browsers: (process.env.BROWSERS || 'chromium').split(/[\s,]+/).filter(Boolean),
  timeouts: {
    testMs: number('TEST_TIMEOUT_MS', 60_000),
    expectMs: number('EXPECT_TIMEOUT_MS', 10_000),
    actionMs: number('ACTION_TIMEOUT_MS', 15_000),
    navigationMs: number('NAVIGATION_TIMEOUT_MS', 30_000),
  },
  perf: {
    pageLoadBudgetMs: number('PERF_PAGE_LOAD_BUDGET_MS', 8000),
    apiP95BudgetMs: number('PERF_API_P95_BUDGET_MS', 3000),
    apiSamples: number('PERF_API_SAMPLES', 10),
  },
};

/**
 * Browser storage state of the logged-in account. Written once per run by the
 * `authSession` fixture when a test first needs it; deleted by global setup.
 */
export const authFile = path.join(root, 'playwright', '.auth', 'user.json');

export interface Credentials {
  username: string;
  password: string;
}

/**
 * Credentials of the pre-registered DemoBlaze account.
 * Resolved lazily so suites that don't need an account (e.g. product API tests)
 * still run when the credentials are not configured.
 *
 * Note: the keys are DEMO_USERNAME / DEMO_PASSWORD rather than USERNAME / PASSWORD
 * because USERNAME is already set by the OS on Windows and by zsh, and would
 * silently win over the value in `.env.<ENV>`.
 */
export function credentials(): Credentials {
  const username = process.env.DEMO_USERNAME;
  const password = process.env.DEMO_PASSWORD;
  if (!username || !password) {
    throw new Error('DEMO_USERNAME and DEMO_PASSWORD must be set (see .env.example)');
  }
  return { username, password };
}
