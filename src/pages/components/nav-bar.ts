import { BaseComponent } from './base-component';

export const navBarLocator = {
  root: '#navbarExample',
  cart: '#cartur',
  login: '#login2',
  signUp: '#signin2',
  logout: '#logout2',
  welcome: '#nameofuser',
} as const;

export const navBarTexts = {
  home: 'Home',
  welcome: (username: string) => `Welcome ${username}`,
} as const;

/** Top navigation shared by every DemoBlaze page. */
export class NavBar extends BaseComponent {
  readonly home = this.page.locator(navBarLocator.root).getByRole('link', { name: navBarTexts.home });
  readonly login = this.page.locator(navBarLocator.login);
  readonly signUp = this.page.locator(navBarLocator.signUp);
  readonly logout = this.page.locator(navBarLocator.logout);
  readonly welcome = this.page.locator(navBarLocator.welcome);

  async openCart(): Promise<void> {
    await this.page.locator(navBarLocator.cart).click();
  }

  async logOut(): Promise<void> {
    await this.logout.click();
  }
}
