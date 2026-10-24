import { acceptDialog } from '../../utils/dialog';
import { globalLocator, globalTexts } from '../global';
import { BaseComponent } from './base-component';

export const loginModalLocator = {
  root: '#logInModal',
  username: '#loginusername',
  password: '#loginpassword',
} as const;

export const loginModalTexts = {
  submitButton: 'Log in',
  alerts: {
    wrongPassword: 'Wrong password.',
    userNotFound: 'User does not exist.',
    missingFields: 'Please fill out Username and Password.',
  },
} as const;

export class LoginModal extends BaseComponent {
  readonly root = this.page.locator(loginModalLocator.root);
  readonly password = this.page.locator(loginModalLocator.password);
  readonly submitButton = this.root.getByRole('button', { name: loginModalTexts.submitButton });
  readonly closeButton = this.root
    .locator(globalLocator.modalFooter)
    .getByRole('button', { name: globalTexts.closeButton });

  async fill(username: string, password: string): Promise<void> {
    await this.page.locator(loginModalLocator.username).fill(username);
    await this.password.fill(password);
  }

  /** Submits valid credentials. A successful login reloads the page. */
  async submit(username: string, password: string): Promise<void> {
    await this.fill(username, password);
    await Promise.all([this.page.waitForEvent('load'), this.submitButton.click()]);
  }

  /** Submits credentials that are expected to be rejected; returns the alert text. */
  async submitExpectingAlert(username: string, password: string): Promise<string> {
    await this.fill(username, password);
    return acceptDialog(this.page, () => this.submitButton.click());
  }
}
