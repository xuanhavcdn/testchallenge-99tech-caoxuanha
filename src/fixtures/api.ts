import { test as base, expect } from '@playwright/test';
import { credentials, env, type Credentials } from '../../config/env';
import { KnownBug } from '../../config/tags';
import { DemoblazeApi } from '../api/demoblaze-api';
import { withAccountLock } from '../utils/account-lock';
import { loadOrCreateSession, type Session } from './auth-session';

export interface ApiFixtures {
  api: DemoblazeApi;
  /** Credentials of the pre-registered account from `.env.<ENV>`. */
  account: Credentials;
  /**
   * Exclusive access to the shared account's (emptied) cart, plus an API token.
   * Request it in any test that changes the account cart; the cart is emptied
   * again afterwards.
   */
  accountCart: Session;
  /** Auto fixture: skips a test tagged `KnownBug.<ENV>` for the current `ENV` (see config/tags.ts). */
  knownBug: void;
}

export interface WorkerFixtures {
  /**
   * The account session, shared by the whole run: logged in through the API the
   * first time a test needs it, then reused (see `loadOrCreateSession`).
   * Tests that need no account never trigger a login.
   */
  authSession: Session;
}

/** Browser-less fixtures, safe for the `api` project. */
export const test = base.extend<ApiFixtures, WorkerFixtures>({
  // Runs before every test, API and UI alike (the UI fixtures extend these). The skip reason
  // names the defect from the test's `issue` annotation, so the report says why it was skipped.
  knownBug: [
    async ({}, use, testInfo) => {
      const issue = testInfo.annotations.find((a) => a.type === 'issue')?.description;
      testInfo.skip(testInfo.tags.includes(KnownBug[env.name]), `Known bug on ${env.name}${issue ? `: ${issue}` : ''}`);
      await use();
    },
    { auto: true },
  ],

  authSession: [async ({ playwright }, use) => use(await loadOrCreateSession(playwright)), { scope: 'worker' }],

  api: async ({ request }, use) => {
    await use(new DemoblazeApi(request));
  },

  account: async ({}, use) => use(credentials()),

  accountCart: async ({ api, authSession }, use) => {
    await withAccountLock(async () => {
      await api.clearCart({ username: authSession.username });
      await use(authSession);
      await api.clearCart({ username: authSession.username });
    });
  },
});

export { expect, type Session };
