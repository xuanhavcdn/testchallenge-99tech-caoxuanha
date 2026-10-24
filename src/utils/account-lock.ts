import fs from 'fs';
import os from 'os';
import path from 'path';

/**
 * Cross-process mutex. Workers are separate processes (one per browser project
 * and more with `--workers`), so in-memory locks don't reach across them.
 *
 * A directory is created atomically by `mkdir`, so it doubles as a simple
 * lock. A lock older than `staleMs` is treated as abandoned (e.g. a worker that
 * was killed) and taken over.
 */
export async function withLock<T>(
  name: string,
  fn: () => Promise<T>,
  { timeoutMs = 180_000, staleMs = 120_000 } = {},
): Promise<T> {
  const lockDir = path.join(os.tmpdir(), `${name}.lock`);
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      fs.mkdirSync(lockDir);
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      const age = Date.now() - safeMtime(lockDir);
      if (age > staleMs) {
        fs.rmSync(lockDir, { recursive: true, force: true });
        continue;
      }
      if (Date.now() > deadline)
        throw new Error(`Timed out after ${timeoutMs}ms waiting for the "${name}" lock`, { cause: error });
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  try {
    return await fn();
  } finally {
    fs.rmSync(lockDir, { recursive: true, force: true });
  }
}

/**
 * The logged-in cart lives server-side and is shared by every session of the
 * account, and placing an order wipes it. Tests that mutate the account cart
 * must therefore not overlap - not even across browser projects.
 */
export function withAccountLock<T>(fn: () => Promise<T>): Promise<T> {
  return withLock('demoblaze-account-cart', fn);
}

function safeMtime(file: string): number {
  try {
    return fs.statSync(file).mtimeMs;
  } catch {
    return Date.now();
  }
}
