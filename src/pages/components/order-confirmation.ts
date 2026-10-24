import { BaseComponent } from './base-component';

export const orderConfirmationLocator = {
  root: '.sweet-alert.visible',
  title: 'h2',
  details: 'p.lead',
} as const;

export const orderConfirmationTexts = {
  title: 'Thank you for your purchase!',
  okButton: 'OK',
} as const;

export interface ConfirmationDetails {
  id: string;
  amount: number;
  card: string;
  name: string;
  date: string;
}

/** The SweetAlert popup shown after a successful purchase. */
export class OrderConfirmation extends BaseComponent {
  readonly root = this.page.locator(orderConfirmationLocator.root);
  readonly title = this.root.locator(orderConfirmationLocator.title);
  readonly okButton = this.root.getByRole('button', { name: orderConfirmationTexts.okButton });

  /**
   * Parses the free-text body, e.g.
   * "Id: 123\nAmount: 360 USD\nCard Number: 4111\nName: Jane\nDate: 24/9/2026"
   */
  async read(): Promise<ConfirmationDetails> {
    const text = await this.root.locator(orderConfirmationLocator.details).innerText();
    const field = (label: string) => text.match(new RegExp(`${label}:\\s*(.*)`))?.[1].trim() ?? '';
    return {
      id: field('Id'),
      amount: Number(field('Amount').replace(/\s*USD$/, '')),
      card: field('Card Number'),
      name: field('Name'),
      date: field('Date'),
    };
  }
}
