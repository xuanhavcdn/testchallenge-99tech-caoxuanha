import { randomUUID } from 'crypto';
import type { APIRequestContext, APIResponse } from '@playwright/test';
import { env } from '../../config/env';

export interface Product {
  id: number;
  title: string;
  price: number;
  cat: string;
  desc: string;
  img: string;
}

export interface CartEntry {
  id: string;
  cookie: string;
  prod_id: number;
}

/** Identifies whose cart an API call targets: a logged-in user's token or a guest cookie. */
export type CartOwner = { token: string } | { guestCookie: string };

/**
 * Thin client over the DemoBlaze REST API (https://api.demoblaze.com).
 *
 * Used both for API tests and for fast UI test setup/teardown (logging in,
 * seeding or clearing a cart) so UI tests only exercise the UI under test.
 */
export class DemoblazeApi {
  constructor(
    private readonly request: APIRequestContext,
    private readonly baseUrl = env.apiUrl,
  ) {}

  /** The web client base64-encodes the password before sending it; mirror that. */
  static encodePassword(password: string): string {
    return Buffer.from(password, 'utf8').toString('base64');
  }

  post(endpoint: string, data: unknown): Promise<APIResponse> {
    return this.request.post(`${this.baseUrl}/${endpoint}`, { data });
  }

  /** Raw login call. Resolves to `"Auth_token: <token>"` on success or `{ errorMessage }` on failure. */
  async loginRaw(username: string, password: string): Promise<APIResponse> {
    return this.post('login', { username, password: DemoblazeApi.encodePassword(password) });
  }

  async login(username: string, password: string): Promise<string> {
    const response = await this.loginRaw(username, password);
    const body = await response.json();
    if (typeof body !== 'string' || !body.startsWith('Auth_token: ')) {
      throw new Error(`Login failed for "${username}": ${JSON.stringify(body)}`);
    }
    return body.replace('Auth_token: ', '');
  }

  async products(): Promise<Product[]> {
    const response = await this.request.get(`${this.baseUrl}/entries`);
    return (await response.json()).Items;
  }

  async product(id: number): Promise<Product> {
    return (await this.post('view', { id: String(id) })).json();
  }

  async addToCart(owner: CartOwner, productId: number): Promise<string> {
    const id = randomUUID();
    await this.post('addtocart', { id, prod_id: productId, ...cartKey(owner) });
    return id;
  }

  async viewCart(owner: CartOwner): Promise<CartEntry[]> {
    const body = await (await this.post('viewcart', cartKey(owner))).json();
    if (body.errorMessage) throw new Error(`viewcart failed: ${body.errorMessage}`);
    return body.Items;
  }

  async deleteCartItem(entryId: string): Promise<void> {
    await this.post('deleteitem', { id: entryId });
  }

  /**
   * Empties a cart. Note the asymmetry of the real API: a user's cart is deleted
   * by *username* (as the web client does after a purchase), a guest cart by cookie.
   */
  async clearCart(owner: { username: string } | { guestCookie: string }): Promise<void> {
    await this.post('deletecart', { cookie: 'username' in owner ? owner.username : owner.guestCookie });
  }
}

function cartKey(owner: CartOwner) {
  return 'token' in owner ? { cookie: owner.token, flag: true } : { cookie: owner.guestCookie, flag: false };
}
