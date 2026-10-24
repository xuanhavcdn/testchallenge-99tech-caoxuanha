import { expect, type Locator } from '@playwright/test';
import type { OrderDetails } from '../data/orders';
import { OrderConfirmation } from './components/order-confirmation';
import { PlaceOrderModal } from './components/place-order-modal';
import { BasePage } from './base-page';
import { globalLocator } from './global';

export const cartPageLocator = {
  rows: `${globalLocator.content} > tr`,
  titleCell: 'td:nth-child(2)',
  total: '#totalp',
} as const;

export const cartPageTexts = {
  path: '/cart.html',
  placeOrderButton: 'Place Order',
  deleteLink: 'Delete',
} as const;

export interface CartRow {
  title: string;
  price: number;
}

export class CartPage extends BasePage {
  readonly rows = this.page.locator(cartPageLocator.rows);
  readonly total = this.page.locator(cartPageLocator.total);
  readonly placeOrderButton = this.page.getByRole('button', { name: cartPageTexts.placeOrderButton });
  readonly orderModal = new PlaceOrderModal(this.page);
  readonly confirmation = new OrderConfirmation(this.page);

  /**
   * Opens the cart and waits for it to finish rendering.
   * Rows are fetched one by one after page load, so callers that know how many
   * items to expect should pass `expectedItems` to avoid reading a partial cart.
   */
  async goto(expectedItems?: number): Promise<void> {
    const viewCart = this.page.waitForResponse((r) => r.url().endsWith('/viewcart'));
    await this.page.goto(cartPageTexts.path);
    await viewCart;
    if (expectedItems !== undefined) await this.expectItemCount(expectedItems);
  }

  async expectItemCount(count: number): Promise<void> {
    await expect(this.rows).toHaveCount(count);
    if (count === 0) {
      await expect(this.total).toBeEmpty();
    } else {
      // The total is re-rendered as each row arrives; wait until it reflects every row.
      await expect(async () => expect(await this.totalValue()).toBe(sum(await this.items()))).toPass();
    }
  }

  row(title: string): Locator {
    return this.rows.filter({ has: this.page.locator(cartPageLocator.titleCell, { hasText: title }) });
  }

  async items(): Promise<CartRow[]> {
    return this.rows.evaluateAll((trs) =>
      trs.map((tr) => ({
        title: tr.children[1]?.textContent?.trim() ?? '',
        price: Number(tr.children[2]?.textContent?.trim()),
      })),
    );
  }

  async totalValue(): Promise<number> {
    const text = (await this.total.innerText()).trim();
    return text === '' ? 0 : Number(text);
  }

  async deleteItem(title: string): Promise<void> {
    const before = await this.rows.count();
    // Deleting reloads the page, which re-fetches the cart.
    const reloaded = this.page.waitForResponse((r) => r.url().endsWith('/viewcart'));
    await this.row(title).first().getByRole('link', { name: cartPageTexts.deleteLink }).click();
    await reloaded;
    await this.expectItemCount(before - 1);
  }

  /**
   * Submits the order form and reports what the site did: showed the purchase
   * confirmation, or rejected the order with an alert. Waiting for one of the two
   * (instead of asserting an absence) keeps negative checks from passing early.
   */
  async submitOrder(
    order: Partial<OrderDetails>,
  ): Promise<{ outcome: 'confirmed' } | { outcome: 'rejected'; alert: string }> {
    const rejected = new Promise<string>((resolve) =>
      this.page.once('dialog', (dialog) => {
        resolve(dialog.message());
        dialog.accept().catch(() => {});
      }),
    );
    await this.orderModal.purchase(order);
    return Promise.race([
      this.confirmation.title.waitFor().then(() => ({ outcome: 'confirmed' as const })),
      rejected.then((alert) => ({ outcome: 'rejected' as const, alert })),
    ]);
  }

  async openPlaceOrder(): Promise<PlaceOrderModal> {
    await this.placeOrderButton.click();
    await this.orderModal.purchaseButton.waitFor({ state: 'visible' });
    return this.orderModal;
  }
}

export function sum(rows: CartRow[]): number {
  return rows.reduce((acc, row) => acc + row.price, 0);
}
