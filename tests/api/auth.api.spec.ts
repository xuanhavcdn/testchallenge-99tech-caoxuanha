import { Tag } from '../../config/tags';
import { DemoblazeApi } from '../../src/api/demoblaze-api';
import { expect, test } from '../../src/fixtures/api';

test.describe('API: authentication', () => {
  test(
    'API_AUTH_001 login with valid credentials returns an auth token',
    { tag: [Tag.api, Tag.smoke, Tag.regression, Tag.login, Tag.demo, Tag.prod] },
    async ({ api, account }) => {
      const response = await api.loginRaw(account.username, account.password);
      expect(response.status()).toBe(200);
      expect(await response.json()).toMatch(/^Auth_token: \S+$/);
    },
  );

  test(
    'API_AUTH_002 the issued token is accepted by /check',
    { tag: [Tag.api, Tag.regression, Tag.login, Tag.demo, Tag.prod] },
    async ({ api, account }) => {
      const token = await api.login(account.username, account.password);
      const body = await (await api.post('check', { token })).json();
      expect(body.Item).toMatchObject({ username: account.username, token });
    },
  );

  test(
    'API_AUTH_003 wrong password is rejected',
    { tag: [Tag.api, Tag.regression, Tag.login, Tag.demo, Tag.prod] },
    async ({ api, account }) => {
      const response = await api.loginRaw(account.username, `${account.password}-wrong`);
      expect(await response.json()).toEqual({ errorMessage: 'Wrong password.' });
    },
  );

  test(
    'API_AUTH_004 unknown user is rejected',
    { tag: [Tag.api, Tag.regression, Tag.login, Tag.demo, Tag.prod] },
    async ({ api }) => {
      const response = await api.loginRaw(`no-such-user-${Date.now()}`, 'whatever');
      expect(await response.json()).toEqual({ errorMessage: 'User does not exist.' });
    },
  );

  test(
    'API_AUTH_005 password sent in plain text (not base64) is rejected',
    { tag: [Tag.api, Tag.regression, Tag.login, Tag.demo, Tag.prod] },
    async ({ api, account }) => {
      const response = await api.post('login', { username: account.username, password: account.password });
      expect(await response.json()).toEqual({ errorMessage: 'Wrong password.' });
    },
  );

  test(
    'API_AUTH_006 malformed token is rejected by /check',
    { tag: [Tag.api, Tag.regression, Tag.login, Tag.demo, Tag.prod] },
    async ({ api }) => {
      const body = await (await api.post('check', { token: 'not-a-token' })).json();
      expect(body.errorMessage).toBeTruthy();
      expect(body.Item).toBeUndefined();
    },
  );

  test(
    'API_AUTH_007 encodes the password the same way as the web client',
    { tag: [Tag.api, Tag.regression, Tag.login, Tag.demo, Tag.prod] },
    async () => {
      // Guard for the helper itself - the web client uses btoa(utf8(password)).
      expect(DemoblazeApi.encodePassword('abc')).toBe('YWJj');
      expect(DemoblazeApi.encodePassword('mật khẩu')).toBe(Buffer.from('mật khẩu').toString('base64'));
    },
  );
});
