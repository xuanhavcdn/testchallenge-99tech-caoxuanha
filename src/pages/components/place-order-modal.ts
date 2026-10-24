import type { OrderDetails } from '../../data/orders';
import { acceptDialog } from '../../utils/dialog';
import { globalLocator, globalTexts } from '../global';
import { BaseComponent } from './base-component';

export const placeOrderModalLocator = {
  root: '#orderModal',
  total: '#totalm',
  name: '#name',
  country: '#country',
  city: '#city',
  card: '#card',
  month: '#month',
  year: '#year',
} as const;

export const placeOrderModalTexts = {
  purchaseButton: 'Purchase',
  total: (amount: number) => `Total: ${amount}`,
  alerts: {
    missingFields: 'Please fill out Name and Creditcard.',
  },
} as const;

/** Order form fields, in the order they appear in the modal. */
const orderFields = ['name', 'country', 'city', 'card', 'month', 'year'] as const;

export class PlaceOrderModal extends BaseComponent {
  readonly root = this.page.locator(placeOrderModalLocator.root);
  readonly total = this.page.locator(placeOrderModalLocator.total);
  readonly purchaseButton = this.root.getByRole('button', { name: placeOrderModalTexts.purchaseButton });
  readonly closeButton = this.root
    .locator(globalLocator.modalFooter)
    .getByRole('button', { name: globalTexts.closeButton });

  async fill(order: Partial<OrderDetails>): Promise<void> {
    for (const field of orderFields) {
      const value = order[field];
      if (value !== undefined) await this.page.locator(placeOrderModalLocator[field]).fill(value);
    }
  }

  async purchase(order: Partial<OrderDetails>): Promise<void> {
    await this.fill(order);
    await this.purchaseButton.click();
  }

  /** Purchases with incomplete details; returns the validation alert text. */
  async purchaseExpectingAlert(order: Partial<OrderDetails>): Promise<string> {
    await this.fill(order);
    return acceptDialog(this.page, () => this.purchaseButton.click());
  }
}
