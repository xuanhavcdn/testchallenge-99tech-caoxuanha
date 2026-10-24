import { acceptDialog } from '../utils/dialog';
import { BasePage } from './base-page';
import { globalLocator } from './global';

export const productPageLocator = {
  title: `${globalLocator.content} h2.name`,
  price: `${globalLocator.content} h3.price-container`,
} as const;

export const productPageTexts = {
  path: (productId: number) => `/prod.html?idp_=${productId}`,
  addToCartButton: 'Add to cart',
  alerts: {
    // The site uses a slightly different message for guests and logged-in users.
    productAddedGuest: 'Product added',
    productAddedUser: 'Product added.',
  },
} as const;

export class ProductPage extends BasePage {
  readonly title = this.page.locator(productPageLocator.title);

  async goto(productId: number): Promise<void> {
    await this.page.goto(productPageTexts.path(productId));
    await this.title.waitFor();
  }

  /** Clicks "Add to cart" and returns the confirmation alert text once the API call has completed. */
  async addToCart(): Promise<string> {
    return acceptDialog(this.page, () =>
      this.page.getByRole('link', { name: productPageTexts.addToCartButton }).click(),
    );
  }

  async priceValue(): Promise<number> {
    const text = await this.page.locator(productPageLocator.price).innerText(); // e.g. "$360 *includes tax"
    return Number(text.match(/\$(\d+(?:\.\d+)?)/)?.[1]);
  }
}
