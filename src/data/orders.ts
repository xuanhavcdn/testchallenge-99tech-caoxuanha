export interface OrderDetails {
  name: string;
  country: string;
  city: string;
  card: string;
  month: string;
  year: string;
}

/** Builds a valid order, unique per call so failures are traceable in reports. */
export function buildOrder(overrides: Partial<OrderDetails> = {}): OrderDetails {
  return {
    name: `QA Automation ${Date.now().toString(36)}`,
    country: 'Vietnam',
    city: 'Ho Chi Minh City',
    card: '4111111111111111',
    month: '12',
    year: '2030',
    ...overrides,
  };
}
