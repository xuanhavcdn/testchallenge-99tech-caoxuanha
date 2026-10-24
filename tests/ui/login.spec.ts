import { KnownBug, Tag } from '../../config/tags';
import { expect, test } from '../../src/fixtures';
import { loginModalTexts } from '../../src/pages/components/login-modal';
import { navBarTexts } from '../../src/pages/components/nav-bar';

test.describe('Login', () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.goto();
  });

  test(
    'TC_LOGIN_001 logs in with valid credentials',
    { tag: [Tag.e2e, Tag.smoke, Tag.regression, Tag.login, Tag.demo, Tag.prod] },
    async ({ homePage, account }) => {
      const modal = await homePage.openLoginModal();
      await modal.submit(account.username, account.password);

      await expect(homePage.nav.welcome).toHaveText(navBarTexts.welcome(account.username));
      await expect(homePage.nav.logout).toBeVisible();
      await expect(homePage.nav.login).toBeHidden();
      await expect(homePage.nav.signUp).toBeHidden();
      expect((await homePage.page.context().cookies()).some((c) => c.name === 'tokenp_' && c.value)).toBe(true);
    },
  );

  test(
    'TC_LOGIN_002 rejects a wrong password',
    { tag: [Tag.e2e, Tag.regression, Tag.login, Tag.demo, Tag.prod] },
    async ({ homePage, account }) => {
      const modal = await homePage.openLoginModal();
      expect(await modal.submitExpectingAlert(account.username, `${account.password}-wrong`)).toBe(
        loginModalTexts.alerts.wrongPassword,
      );

      await expect(modal.root).toBeVisible();
      await expect(homePage.nav.welcome).toBeHidden();
    },
  );

  test(
    'TC_LOGIN_003 rejects an unregistered username',
    { tag: [Tag.e2e, Tag.regression, Tag.login, Tag.demo, Tag.prod] },
    async ({ homePage }) => {
      const modal = await homePage.openLoginModal();
      const unknownUser = `no-such-user-${Date.now()}`;
      expect(await modal.submitExpectingAlert(unknownUser, 'any-password')).toBe(loginModalTexts.alerts.userNotFound);
      await expect(homePage.nav.welcome).toBeHidden();
    },
  );

  const missingFieldCases = [
    { id: 'TC_LOGIN_004', name: 'both fields empty', username: '', password: '' },
    { id: 'TC_LOGIN_005', name: 'username empty', username: '', password: 'secret' },
    { id: 'TC_LOGIN_006', name: 'password empty', username: 'someone', password: '' },
  ];
  for (const { id, name, username, password } of missingFieldCases) {
    test(
      `${id} requires both fields (${name})`,
      { tag: [Tag.e2e, Tag.regression, Tag.login, Tag.demo, Tag.prod] },
      async ({ homePage }) => {
        const modal = await homePage.openLoginModal();
        expect(await modal.submitExpectingAlert(username, password)).toBe(loginModalTexts.alerts.missingFields);
        await expect(homePage.nav.welcome).toBeHidden();
      },
    );
  }

  test(
    'TC_LOGIN_007 treats the username as case-sensitive',
    { tag: [Tag.e2e, Tag.regression, Tag.login, Tag.demo, Tag.prod] },
    async ({ homePage, account }) => {
      test.skip(account.username.toUpperCase() === account.username, 'account username has no letters to change case');
      const modal = await homePage.openLoginModal();
      expect(await modal.submitExpectingAlert(account.username.toUpperCase(), account.password)).toBe(
        loginModalTexts.alerts.userNotFound,
      );
    },
  );

  test(
    'TC_LOGIN_008 does not trim whitespace around the username',
    { tag: [Tag.e2e, Tag.regression, Tag.login, Tag.demo, Tag.prod] },
    async ({ homePage, account }) => {
      const modal = await homePage.openLoginModal();
      expect(await modal.submitExpectingAlert(` ${account.username} `, account.password)).toBe(
        loginModalTexts.alerts.userNotFound,
      );
    },
  );

  test(
    'TC_LOGIN_009 masks the password input',
    { tag: [Tag.e2e, Tag.regression, Tag.login, Tag.demo, Tag.prod] },
    async ({ homePage }) => {
      const modal = await homePage.openLoginModal();
      await expect(modal.password).toHaveAttribute('type', 'password');
    },
  );

  test(
    'TC_LOGIN_010 keeps the session after a page reload',
    { tag: [Tag.e2e, Tag.regression, Tag.login, Tag.demo, Tag.prod] },
    async ({ homePage, account }) => {
      const modal = await homePage.openLoginModal();
      await modal.submit(account.username, account.password);
      await expect(homePage.nav.welcome).toHaveText(navBarTexts.welcome(account.username));

      await homePage.page.reload();
      await expect(homePage.nav.welcome).toHaveText(navBarTexts.welcome(account.username));
    },
  );

  test(
    'TC_LOGIN_011 logs out and clears the session',
    { tag: [Tag.e2e, Tag.smoke, Tag.regression, Tag.login, Tag.demo, Tag.prod] },
    async ({ homePage, account }) => {
      const modal = await homePage.openLoginModal();
      await modal.submit(account.username, account.password);
      await expect(homePage.nav.logout).toBeVisible();

      await homePage.nav.logOut();

      await expect(homePage.nav.login).toBeVisible();
      await expect(homePage.nav.welcome).toBeHidden();
      expect((await homePage.page.context().cookies()).find((c) => c.name === 'tokenp_')?.value ?? '').toBe('');
    },
  );

  test(
    'TC_LOGIN_012 closing the modal discards the entered credentials attempt',
    { tag: [Tag.e2e, Tag.regression, Tag.login, Tag.demo, Tag.prod] },
    async ({ homePage, account }) => {
      const modal = await homePage.openLoginModal();
      await modal.fill(account.username, account.password);
      await modal.closeButton.click();

      await expect(modal.root).toBeHidden();
      await expect(homePage.nav.login).toBeVisible();
      await expect(homePage.nav.welcome).toBeHidden();
    },
  );

  test(
    'TC_LOGIN_019 issues an auth token that cannot be derived from the username',
    {
      tag: [Tag.e2e, Tag.regression, Tag.login, Tag.demo, Tag.prod, KnownBug.demo, KnownBug.prod],
      annotation: { type: 'issue', description: 'D-04: the auth token is base64(username + expiry)' },
    },
    async ({ homePage, account }) => {
      const modal = await homePage.openLoginModal();
      await modal.submit(account.username, account.password);
      await expect(homePage.nav.welcome).toHaveText(navBarTexts.welcome(account.username));

      const token = (await homePage.page.context().cookies()).find((c) => c.name === 'tokenp_')?.value ?? '';
      expect(token).not.toBe('');
      expect(Buffer.from(token, 'base64').toString()).not.toContain(account.username);
    },
  );
});
