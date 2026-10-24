import { authFile, env } from '../../config/env';
import { Tag } from '../../config/tags';
import { products } from '../../src/data/products';
import { expect, test } from '../../src/fixtures';
import { CartPage } from '../../src/pages/cart-page';
import { navBarTexts } from '../../src/pages/components/nav-bar';
import { productPageTexts } from '../../src/pages/product-page';

/**
 * Cart behaviour as a guest. Every test gets its own guest cart (see the
 * `guestCookie` fixture), so these run fully in parallel across browsers.
 */
test.describe('Cart', () => {
  test(
    'TC_CART_001 adds a product from the product page',
    { tag: [Tag.e2e, Tag.smoke, Tag.regression, Tag.cart, Tag.demo] },
    async ({ productPage, cartPage }) => {
      const { id, title, price } = products.samsungGalaxyS6;
      await productPage.goto(id);
      await expect(productPage.title).toHaveText(title);
      expect(await productPage.priceValue()).toBe(price);

      expect(await productPage.addToCart()).toBe(productPageTexts.alerts.productAddedGuest);

      await cartPage.goto(1);
      expect(await cartPage.items()).toEqual([{ title, price }]);
      expect(await cartPage.totalValue()).toBe(price);
    },
  );

  test(
    'TC_CART_002 opens a product from the home page and adds it',
    { tag: [Tag.e2e, Tag.regression, Tag.cart, Tag.demo] },
    async ({ homePage, productPage, cartPage }) => {
      const { title } = products.nokiaLumia1520;
      await homePage.goto();
      await homePage.openProduct(title);
      await expect(productPage.title).toHaveText(title);
      await productPage.addToCart();

      await homePage.nav.openCart();
      await cartPage.expectItemCount(1);
      await expect(cartPage.row(title)).toBeVisible();
    },
  );

  test(
    'TC_CART_003 sums the total of several different products',
    { tag: [Tag.e2e, Tag.regression, Tag.cart, Tag.demo] },
    async ({ productPage, cartPage }) => {
      const picked = [products.samsungGalaxyS6, products.nokiaLumia1520, products.sonyVaioI5];
      for (const product of picked) {
        await productPage.goto(product.id);
        await productPage.addToCart();
      }

      await cartPage.goto(picked.length);
      expect((await cartPage.items()).map((i) => i.title).sort()).toEqual(picked.map((p) => p.title).sort());
      expect(await cartPage.totalValue()).toBe(picked.reduce((acc, p) => acc + p.price, 0));
    },
  );

  test(
    'TC_CART_004 lists the same product twice when added twice',
    { tag: [Tag.e2e, Tag.regression, Tag.cart, Tag.demo] },
    async ({ productPage, cartPage }) => {
      const { id, title, price } = products.nexus6;
      await productPage.goto(id);
      await productPage.addToCart();
      await productPage.addToCart();

      await cartPage.goto(2);
      await expect(cartPage.row(title)).toHaveCount(2);
      expect(await cartPage.totalValue()).toBe(price * 2);
    },
  );

  test(
    'TC_CART_005 deletes an item and recalculates the total',
    { tag: [Tag.e2e, Tag.regression, Tag.cart, Tag.demo] },
    async ({ api, guestCookie, cartPage }) => {
      // Seed through the API: this test is about deleting, not adding.
      await api.addToCart({ guestCookie }, products.samsungGalaxyS6.id);
      await api.addToCart({ guestCookie }, products.nexus6.id);
      await cartPage.goto(2);

      await cartPage.deleteItem(products.samsungGalaxyS6.title);

      expect(await cartPage.items()).toEqual([{ title: products.nexus6.title, price: products.nexus6.price }]);
      expect(await cartPage.totalValue()).toBe(products.nexus6.price);
    },
  );

  test(
    'TC_CART_006 deleting the last item leaves an empty cart',
    { tag: [Tag.e2e, Tag.regression, Tag.cart, Tag.demo] },
    async ({ api, guestCookie, cartPage }) => {
      await api.addToCart({ guestCookie }, products.nexus6.id);
      await cartPage.goto(1);

      await cartPage.deleteItem(products.nexus6.title);

      await cartPage.expectItemCount(0);
    },
  );

  test(
    'TC_CART_007 shows an empty cart for a new visitor',
    { tag: [Tag.e2e, Tag.regression, Tag.cart, Tag.demo, Tag.prod] },
    async ({ cartPage }) => {
      await cartPage.goto(0);
      await expect(cartPage.placeOrderButton).toBeVisible();
    },
  );

  test(
    'TC_CART_008 keeps cart contents after a page reload',
    { tag: [Tag.e2e, Tag.regression, Tag.cart, Tag.demo] },
    async ({ productPage, cartPage }) => {
      await productPage.goto(products.nokiaLumia1520.id);
      await productPage.addToCart();
      await cartPage.goto(1);

      await cartPage.goto(1);
      await expect(cartPage.row(products.nokiaLumia1520.title)).toBeVisible();
    },
  );

  test(
    'TC_CART_009 adding to cart does not require login',
    { tag: [Tag.e2e, Tag.regression, Tag.cart, Tag.demo] },
    async ({ productPage, cartPage }) => {
      await productPage.goto(products.sonyVaioI5.id);
      await expect(productPage.nav.login).toBeVisible();
      expect(await productPage.addToCart()).toBe(productPageTexts.alerts.productAddedGuest);
      await cartPage.goto(1);
    },
  );
});

test.describe('Cart (logged in)', () => {
  test(
    'TC_CART_010 persists the user cart across browser sessions',
    { tag: [Tag.e2e, Tag.regression, Tag.login, Tag.cart, Tag.demo] },
    async ({ accountCart, browser, api }) => {
      await api.addToCart({ token: accountCart.token }, products.nexus6.id);

      // A brand-new context (another device) logged in as the same user sees the same cart.
      const context = await browser.newContext({ storageState: authFile });
      try {
        const cart = new CartPage(await context.newPage());
        await cart.goto(1);
        await expect(cart.nav.welcome).toHaveText(navBarTexts.welcome(accountCart.username));
        await expect(cart.row(products.nexus6.title)).toBeVisible();
      } finally {
        await context.close();
      }
    },
  );

  test(
    'TC_CART_011 keeps guest and user carts separate',
    { tag: [Tag.e2e, Tag.regression, Tag.login, Tag.cart, Tag.demo] },
    async ({ accountCart, api, guestCookie, cartPage, context }) => {
      await api.addToCart({ guestCookie }, products.samsungGalaxyS6.id);
      await api.addToCart({ token: accountCart.token }, products.nokiaLumia1520.id);

      await cartPage.goto(1);
      await expect(cartPage.row(products.samsungGalaxyS6.title)).toBeVisible();

      await context.addCookies([{ name: 'tokenp_', value: accountCart.token, url: env.baseUrl }]);
      await cartPage.goto(1);
      await expect(cartPage.row(products.nokiaLumia1520.title)).toBeVisible();
    },
  );
});
