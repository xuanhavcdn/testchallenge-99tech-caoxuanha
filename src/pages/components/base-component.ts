import type { Page } from '@playwright/test';

/**
 * Base for UI components. `page` is assigned here, in the base constructor, so
 * subclasses can declare their locators as field initializers that use it.
 */
export abstract class BaseComponent {
  constructor(protected readonly page: Page) {}
}
