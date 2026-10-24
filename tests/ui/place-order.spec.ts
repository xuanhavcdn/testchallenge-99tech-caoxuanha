import { KnownBug, Tag } from '../../config/tags';
import { buildOrder } from '../../src/data/orders';
import { products } from '../../src/data/products';
import { expect, test } from '../../src/fixtures';
import { orderConfirmationTexts } from '../../src/pages/components/order-confirmation';
import { placeOrderModalTexts } from '../../src/pages/components/place-order-modal';

/** Place-order form validation and outcome, as a guest with a seeded cart. */
test.describe('Place order', () => {
  test.describe('with items in the cart', () => {
    test.beforeEach(async ({ api, guestCookie, cartPage }) => {
      await api.addToCart({ guestCookie }, products.samsungGalaxyS6.id);
      await cartPage.goto(1);
    });

    test(
      'TC_ORDER_001 shows the cart total in the order form',
      { tag: [Tag.e2e, Tag.regression, Tag.cart, Tag.order, Tag.demo] },
      async ({ cartPage }) => {
        const modal = await cartPage.openPlaceOrder();
        await expect(modal.total).toHaveText(placeOrderModalTexts.total(products.samsungGalaxyS6.price));
      },
    );

    test(
      'TC_ORDER_002 purchases with all fields filled',
      { tag: [Tag.e2e, Tag.smoke, Tag.regression, Tag.cart, Tag.order, Tag.demo] },
      async ({ cartPage, homePage }) => {
        const order = buildOrder();
        const modal = await cartPage.openPlaceOrder();
        await modal.purchase(order);

        await expect(cartPage.confirmation.title).toHaveText(orderConfirmationTexts.title);
        const details = await cartPage.confirmation.read();
        expect(details.id).toMatch(/^\d+$/);
        expect(details.amount).toBe(products.samsungGalaxyS6.price);
        expect(details.card).toBe(order.card);
        expect(details.name).toBe(order.name);

        await cartPage.confirmation.okButton.click();
        await expect(homePage.page).toHaveURL(/index\.html/);
        await cartPage.goto(0);
      },
    );

    test(
      'TC_ORDER_003 purchases with only the mandatory name and card',
      { tag: [Tag.e2e, Tag.regression, Tag.cart, Tag.order, Tag.demo] },
      async ({ cartPage }) => {
        const { name, card } = buildOrder();
        const modal = await cartPage.openPlaceOrder();
        await modal.purchase({ name, card });
        await expect(cartPage.confirmation.title).toHaveText(orderConfirmationTexts.title);
      },
    );

    const missingCases = [
      { id: 'TC_ORDER_004', name: 'all fields empty', order: {} },
      { id: 'TC_ORDER_005', name: 'name missing', order: { ...buildOrder(), name: '' } },
      { id: 'TC_ORDER_006', name: 'card missing', order: { ...buildOrder(), card: '' } },
    ];
    for (const { id, name, order } of missingCases) {
      test(
        `${id} rejects an order with ${name}`,
        { tag: [Tag.e2e, Tag.regression, Tag.cart, Tag.order, Tag.demo] },
        async ({ cartPage }) => {
          const modal = await cartPage.openPlaceOrder();
          expect(await modal.purchaseExpectingAlert(order)).toBe(placeOrderModalTexts.alerts.missingFields);
          await expect(cartPage.confirmation.root).toBeHidden();
          // Nothing was bought: the cart is untouched.
          await cartPage.goto(1);
        },
      );
    }

    test(
      'TC_ORDER_007 closing the order form keeps the cart',
      { tag: [Tag.e2e, Tag.regression, Tag.cart, Tag.order, Tag.demo] },
      async ({ cartPage }) => {
        const modal = await cartPage.openPlaceOrder();
        await modal.fill(buildOrder());
        await modal.closeButton.click();
        await expect(modal.root).toBeHidden();
        await cartPage.goto(1);
      },
    );

    test(
      'TC_ORDER_008 shows the purchase date with the correct month',
      { tag: [Tag.e2e, Tag.regression, Tag.cart, Tag.order, Tag.demo] },
      async ({ cartPage, page }) => {
        test.fail(
          true,
          'Known defect: the confirmation uses the zero-based Date#getMonth(), so the month is one behind',
        );
        const modal = await cartPage.openPlaceOrder();
        await modal.purchase(buildOrder());
        const { date } = await cartPage.confirmation.read();
        const today = await page.evaluate(() => {
          const d = new Date();
          return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
        });
        expect(date).toBe(today);
      },
    );

    test(
      'TC_ORDER_009 rejects a non-numeric card number',
      { tag: [Tag.e2e, Tag.regression, Tag.cart, Tag.order, Tag.demo] },
      async ({ cartPage }) => {
        test.fail(true, 'Known defect: the card number is not validated at all');
        await cartPage.openPlaceOrder();
        const result = await cartPage.submitOrder(buildOrder({ card: 'not-a-card' }));
        expect(result.outcome).toBe('rejected');
      },
    );

    test(
      'TC_ORDER_011 rejects an invalid expiry month and year',
      {
        tag: [Tag.e2e, Tag.regression, Tag.cart, Tag.order, Tag.demo, KnownBug.demo],
        annotation: { type: 'issue', description: 'D-05: card expiry month and year are not validated' },
      },
      async ({ cartPage }) => {
        await cartPage.openPlaceOrder();
        const result = await cartPage.submitOrder(buildOrder({ month: '13', year: '1999' }));
        expect(result.outcome).toBe('rejected');
      },
    );
  });

  test(
    'TC_ORDER_010 does not allow placing an order with an empty cart',
    { tag: [Tag.e2e, Tag.regression, Tag.cart, Tag.order, Tag.demo] },
    async ({ cartPage }) => {
      test.fail(true, 'Known defect: an empty cart can be "purchased" for 0 USD');
      await cartPage.goto(0);
      await cartPage.openPlaceOrder();
      const result = await cartPage.submitOrder(buildOrder());
      expect(result.outcome).toBe('rejected');
    },
  );
});
