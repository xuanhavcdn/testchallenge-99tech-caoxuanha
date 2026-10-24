import type { Dialog, Page } from '@playwright/test';

/**
 * DemoBlaze reports most outcomes through native `alert()` dialogs.
 *
 * Runs `action`, accepts the next dialog it raises and returns the dialog's message.
 * The listener is registered *before* the action and accepts the dialog itself,
 * because a synchronous alert blocks the click until it's handled - awaiting the
 * click and the dialog together would deadlock.
 */
export async function acceptDialog(page: Page, action: () => Promise<unknown>, timeoutMs = 15_000): Promise<string> {
  let onDialog: ((dialog: Dialog) => void) | undefined;
  const message = new Promise<string>((resolve) => {
    onDialog = (dialog) => {
      resolve(dialog.message());
      dialog.accept().catch(() => {});
    };
    page.once('dialog', onDialog);
  });

  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`No dialog appeared within ${timeoutMs}ms`)), timeoutMs);
  });

  try {
    await action();
    return await Promise.race([message, timeout]);
  } finally {
    clearTimeout(timer);
    if (onDialog) page.off('dialog', onDialog);
  }
}
