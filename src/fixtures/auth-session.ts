import fs from 'fs';
import path from 'path';
import type { PlaywrightWorkerArgs } from '@playwright/test';
import { authFile, credentials, env } from '../../config/env';
import { DemoblazeApi } from '../api/demoblaze-api';
import { withLock } from '../utils/account-lock';

export interface Session {
  username: string;
  token: string;
}

interface StorageState {
  cookies: { name: string; value: string }[];
}

/**
 * Returns the account session for this run, logging in only the first time any
 * worker needs it. The session is saved to `authFile` as Playwright storage
 * state, so other workers - and `browser.newContext({ storageState: authFile })` -
 * reuse it. Global setup deletes the file at the start of each run.
 *
 * DemoBlaze returns the same token on every login and logging out only clears
 * the cookie, so the saved session stays valid while login tests log in and out.
 */
export async function loadOrCreateSession(playwright: PlaywrightWorkerArgs['playwright']): Promise<Session> {
  const { username, password } = credentials();
  const saved = readToken();
  if (saved) return { username, token: saved };

  return withLock('demoblaze-auth-session', async () => {
    // Another worker may have logged in while this one waited for the lock.
    const savedMeanwhile = readToken();
    if (savedMeanwhile) return { username, token: savedMeanwhile };

    const request = await playwright.request.newContext();
    try {
      const token = await new DemoblazeApi(request).login(username, password);
      writeStorageState(token);
      return { username, token };
    } finally {
      await request.dispose();
    }
  });
}

function readToken(): string | undefined {
  if (!fs.existsSync(authFile)) return undefined;
  const { cookies } = JSON.parse(fs.readFileSync(authFile, 'utf8')) as StorageState;
  return cookies.find((c) => c.name === 'tokenp_')?.value || undefined;
}

/** Writes the token as Playwright storage state, via a temp file so readers never see a partial file. */
function writeStorageState(token: string): void {
  const state = {
    cookies: [
      {
        name: 'tokenp_',
        value: token,
        domain: new URL(env.baseUrl).hostname,
        path: '/',
        expires: -1,
        httpOnly: false,
        secure: false,
        sameSite: 'Lax',
      },
    ],
    origins: [],
  };
  fs.mkdirSync(path.dirname(authFile), { recursive: true });
  const temp = `${authFile}.${process.pid}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(state, null, 2));
  fs.renameSync(temp, authFile);
}
