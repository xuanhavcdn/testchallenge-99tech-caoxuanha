import type { Page } from '@playwright/test';
import { LoginModal } from './components/login-modal';
import { NavBar } from './components/nav-bar';

export abstract class BasePage {
  readonly nav: NavBar;
  readonly loginModal: LoginModal;

  constructor(readonly page: Page) {
    this.nav = new NavBar(page);
    this.loginModal = new LoginModal(page);
  }

  async openLoginModal(): Promise<LoginModal> {
    await this.nav.login.click();
    await this.loginModal.password.waitFor({ state: 'visible' });
    return this.loginModal;
  }
}
