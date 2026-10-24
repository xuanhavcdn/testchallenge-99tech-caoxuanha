import { Tag } from '../../config/tags';
import { expect, test } from '../../src/fixtures';
import { navBarTexts } from '../../src/pages/components/nav-bar';

/**
 * Health check: can a user log in right now? Run every 30 minutes by
 * .github/workflows/healthcheck.yml on Chrome. Read-only, so it is safe on prod.
 * Kept small and fast; full login coverage lives in tests/ui/login.spec.ts.
 */
test.describe('Health check: login', () => {
  test(
    'HC_LOGIN_001 user can log in and out through the UI',
    { tag: [Tag.healthcheck, Tag.smoke, Tag.login, Tag.demo, Tag.prod] },
    async ({ homePage, account }) => {
      await test.step('Home page loads with the product list', async () => {
        await homePage.goto();
        await expect(homePage.nav.login).toBeVisible();
      });

      await test.step('Log in with valid credentials', async () => {
        const modal = await homePage.openLoginModal();
        await modal.submit(account.username, account.password);
        await expect(homePage.nav.welcome).toHaveText(navBarTexts.welcome(account.username));
        expect((await homePage.page.context().cookies()).some((c) => c.name === 'tokenp_' && c.value)).toBe(true);
      });

      await test.step('Log out', async () => {
        await homePage.nav.logOut();
        await expect(homePage.nav.login).toBeVisible();
        await expect(homePage.nav.welcome).toBeHidden();
      });
    },
  );

  test(
    'HC_LOGIN_002 login API issues a token that the API accepts',
    { tag: [Tag.healthcheck, Tag.smoke, Tag.login, Tag.demo, Tag.prod] },
    async ({ api, account }) => {
      // Login is what this test checks, so it logs in itself instead of reusing authSession.
      const token = await api.login(account.username, account.password);
      const body = await (await api.post('check', { token })).json();
      expect(body.Item).toMatchObject({ username: account.username, token });
    },
  );
});
