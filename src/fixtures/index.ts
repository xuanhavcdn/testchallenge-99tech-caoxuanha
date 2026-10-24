import { randomUUID } from 'crypto';
import { env } from '../../config/env';
import { CartPage } from '../pages/cart-page';
import { HomePage } from '../pages/home-page';
import { ProductPage } from '../pages/product-page';
import { test as apiTest, expect, type Session } from './api';

interface UiFixtures {
  homePage: HomePage;
  productPage: ProductPage;
  cartPage: CartPage;
  /** The guest cart cookie of this test's browser context (`user=<uuid>`). */
  guestCookie: string;
  /** Logs the browser context in with the run's account session (see `authSession`) and returns it. */
  session: Session;
}

/** UI fixtures: page objects and browser session helpers on top of the API fixtures. */
export const test = apiTest.extend<UiFixtures>({
  homePage: async ({ page }, use) => use(new HomePage(page)),
  productPage: async ({ page }, use) => use(new ProductPage(page)),
  cartPage: async ({ page }, use) => use(new CartPage(page)),

  // Auto fixture: every browser context gets its own guest cart id up front.
  // Without it a page opened directly (not via the home page) has no `user`
  // cookie, and all such guests would share the cart keyed by an empty cookie.
  guestCookie: [
    async ({ context, api }, use) => {
      const id = randomUUID();
      await context.addCookies([{ name: 'user', value: id, url: env.baseUrl }]);
      const cookie = `user=${id}`;
      await use(cookie);
      await api.clearCart({ guestCookie: cookie }).catch(() => {});
    },
    { auto: true },
  ],

  session: async ({ context, authSession }, use) => {
    await context.addCookies([{ name: 'tokenp_', value: authSession.token, url: env.baseUrl }]);
    await use(authSession);
  },
});

export { expect, type Session };
