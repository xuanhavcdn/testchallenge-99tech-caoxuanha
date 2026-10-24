import { Tag } from '../../config/tags';
import { randomUUID } from 'crypto';
import { products } from '../../src/data/products';
import { expect, test } from '../../src/fixtures/api';

test.describe('API: products', () => {
  test(
    'API_PROD_001 lists products with the expected shape',
    { tag: [Tag.api, Tag.smoke, Tag.regression, Tag.product, Tag.demo, Tag.prod] },
    async ({ api }) => {
      const items = await api.products();
      expect(items.length).toBeGreaterThan(0);
      for (const item of items) {
        expect(item).toEqual(
          expect.objectContaining({
            id: expect.any(Number),
            title: expect.any(String),
            price: expect.any(Number),
            cat: expect.any(String),
          }),
        );
        expect(item.price).toBeGreaterThan(0);
      }
    },
  );

  test(
    'API_PROD_002 returns a single product by id',
    { tag: [Tag.api, Tag.regression, Tag.product, Tag.demo, Tag.prod] },
    async ({ api }) => {
      const { id, title, price } = products.samsungGalaxyS6;
      expect(await api.product(id)).toMatchObject({ id, title, price });
    },
  );

  test(
    'API_PROD_003 unknown product id returns "Not found."',
    { tag: [Tag.api, Tag.regression, Tag.product, Tag.demo, Tag.prod] },
    async ({ api }) => {
      expect(await api.product(999_999)).toEqual({ errorMessage: 'Not found.' });
    },
  );
});

test.describe('API: guest cart', () => {
  // A fresh guest cookie per test keeps the cart isolated.
  let guestCookie: string;

  test.beforeEach(() => {
    guestCookie = `user=${randomUUID()}`;
  });

  test.afterEach(async ({ api }) => {
    await api.clearCart({ guestCookie });
  });

  test(
    'API_CART_001 add, view and delete a cart item',
    { tag: [Tag.api, Tag.regression, Tag.cart, Tag.demo] },
    async ({ api }) => {
      const entryId = await api.addToCart({ guestCookie }, products.nexus6.id);
      expect(await api.viewCart({ guestCookie })).toEqual([
        { id: entryId, cookie: guestCookie, prod_id: products.nexus6.id },
      ]);

      await api.deleteCartItem(entryId);
      expect(await api.viewCart({ guestCookie })).toEqual([]);
    },
  );

  test(
    'API_CART_002 deletecart empties the whole cart',
    { tag: [Tag.api, Tag.regression, Tag.cart, Tag.demo] },
    async ({ api }) => {
      await api.addToCart({ guestCookie }, products.nexus6.id);
      await api.addToCart({ guestCookie }, products.samsungGalaxyS6.id);
      expect(await api.viewCart({ guestCookie })).toHaveLength(2);

      await api.clearCart({ guestCookie });
      expect(await api.viewCart({ guestCookie })).toEqual([]);
    },
  );

  test(
    'API_CART_003 carts of different guests are isolated',
    { tag: [Tag.api, Tag.regression, Tag.cart, Tag.demo] },
    async ({ api }) => {
      const otherGuest = `user=${randomUUID()}`;
      await api.addToCart({ guestCookie }, products.nexus6.id);
      expect(await api.viewCart({ guestCookie: otherGuest })).toEqual([]);
    },
  );
});

test.describe('API: user cart', () => {
  test(
    'API_CART_004 user cart is addressed by auth token',
    { tag: [Tag.api, Tag.regression, Tag.cart, Tag.demo] },
    async ({ api, accountCart }) => {
      const owner = { token: accountCart.token };
      const entryId = await api.addToCart(owner, products.sonyVaioI5.id);
      expect(await api.viewCart(owner)).toEqual([
        { id: entryId, cookie: accountCart.username, prod_id: products.sonyVaioI5.id },
      ]);
    },
  );

  test(
    'API_CART_005 viewcart with a malformed token is rejected',
    { tag: [Tag.api, Tag.regression, Tag.cart, Tag.demo, Tag.prod] },
    async ({ api }) => {
      const body = await (await api.post('viewcart', { cookie: 'not-a-token', flag: true })).json();
      expect(body).toEqual({ errorMessage: 'Bad parameter, token malformed.' });
    },
  );
});
