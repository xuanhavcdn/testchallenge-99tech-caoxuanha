import fs from 'fs';
import { authFile } from './env';

/**
 * Runs once before all tests and is not reported as a test.
 *
 * Deletes the session saved by a previous run, so this run logs in afresh - once,
 * and only if a test needs the account (see the `authSession` fixture).
 */
export default function globalSetup(): void {
  fs.rmSync(authFile, { force: true });
}
