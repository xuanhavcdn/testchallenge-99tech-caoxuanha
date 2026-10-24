import { Tag } from '../../config/tags';
import { buildOrder } from '../../src/data/orders';
import { products } from '../../src/data/products';
import { expect, test } from '../../src/fixtures';
import { sum } from '../../src/pages/cart-page';
import { navBarTexts } from '../../src/pages/components/nav-bar';
import { orderConfirmationTexts } from '../../src/pages/components/order-confirmation';
import { placeOrderModalTexts } from '../../src/pages/components/place-order-modal';
import { productPageTexts } from '../../src/pages/product-page';

/**
 * The challenge demo: log in with the registered account, add products to the
 * cart, place the order - entirely through the UI.
 *
 * `accountCart` serialises access to the account's server-side cart (shared by
 * every browser project) and starts each run from an empty cart.
 */
test.describe('Demo: login, add to cart, place order', () => {
  test(
    'TC_E2E_001 user logs in, buys two products and the cart is emptied',
    { tag: [Tag.e2e, Tag.smoke, Tag.login, Tag.cart, Tag.order, Tag.demo] },
    async ({ account, accountCart, homePage, productPage, cartPage }) => {
      const basket = [products.samsungGalaxyS6, products.sonyVaioI5];
      const order = buildOrder();

      await test.step('Log in with valid credentials', async () => {
        await homePage.goto();
        const modal = await homePage.openLoginModal();
        await modal.submit(account.username, account.password);
        await expect(homePage.nav.welcome).toHaveText(navBarTexts.welcome(accountCart.username));
      });

      await test.step('Add products to the cart', async () => {
        for (const product of basket) {
          await homePage.nav.home.click();
          await homePage.openProduct(product.title);
          await expect(productPage.title).toHaveText(product.title);
          expect(await productPage.addToCart()).toBe(productPageTexts.alerts.productAddedUser);
        }
      });

      await test.step('Review the cart', async () => {
        await homePage.nav.openCart();
        await cartPage.expectItemCount(basket.length);
        const items = await cartPage.items();
        expect(items.map((i) => i.title).sort()).toEqual(basket.map((p) => p.title).sort());
        expect(await cartPage.totalValue()).toBe(sum([...basket]));
      });

      await test.step('Place the order', async () => {
        const modal = await cartPage.openPlaceOrder();
        await expect(modal.total).toHaveText(placeOrderModalTexts.total(sum([...basket])));
        await modal.purchase(order);
      });

      await test.step('Verify the purchase confirmation', async () => {
        await expect(cartPage.confirmation.title).toHaveText(orderConfirmationTexts.title);
        const details = await cartPage.confirmation.read();
        expect(details).toMatchObject({ amount: sum([...basket]), card: order.card, name: order.name });
        expect(details.id).toMatch(/^\d+$/);
        await cartPage.confirmation.okButton.click();
        await expect(homePage.page).toHaveURL(/index\.html/);
        await expect(homePage.nav.welcome).toHaveText(navBarTexts.welcome(accountCart.username));
      });

      await test.step('Cart is empty after the purchase', async () => {
        await cartPage.goto(0);
      });
    },
  );
});
