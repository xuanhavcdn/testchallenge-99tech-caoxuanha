import { test as base, expect } from '@playwright/test';
import { credentials, type Credentials } from '../../config/env';
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
