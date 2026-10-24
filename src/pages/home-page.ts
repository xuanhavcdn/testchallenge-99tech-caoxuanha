import type { Locator } from '@playwright/test';
import { BasePage } from './base-page';
import { globalLocator } from './global';

export const homePageLocator = {
  productCards: `${globalLocator.content} .card`,
  productLinks: `${globalLocator.content} .card-title a`,
} as const;

export const homePageTexts = {
  path: '/index.html',
  productUrl: /prod\.html/,
} as const;

export class HomePage extends BasePage {
  async goto(): Promise<void> {
    await this.page.goto(homePageTexts.path);
    await this.page.locator(homePageLocator.productCards).first().waitFor();
  }

  productLink(title: string): Locator {
    return this.page.locator(homePageLocator.productLinks, { hasText: title });
  }

  async openProduct(title: string): Promise<void> {
    await this.productLink(title).click();
    await this.page.waitForURL(homePageTexts.productUrl);
  }
}
