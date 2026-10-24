---
name: implement-test-case
description: Implement new or changed automated test cases in this DemoBlaze Playwright + TypeScript framework - page objects (locator/texts maps, components), fixtures, test data, specs with IDs and tags, and the Excel test case entry. Use when asked to add, automate, write or extend a test case (TC_*, API_*, PERF_*), cover a new page/feature/flow, or add a page object or component.
---

# Implementing test cases

Follow the existing patterns exactly; read the closest existing file before writing a new one
(`src/pages/cart-page.ts` is the fullest page, `tests/ui/cart.spec.ts` the fullest spec).

## Workflow

1. **Pick the ID and place.** Find the next free ID in `scripts/generate-test-cases.mts` and the specs
   (`grep -rn "TC_CART_" tests scripts`). Never reuse or renumber an ID.
2. **Page layer first** - add any missing locator, text or method to the page/component (below).
   Specs never contain selectors or user-visible strings.
3. **Fixture / data** if the test needs a new page object or data.
4. **Write the test** in the right spec file with ID, tags and the right fixtures.
5. **Document it** in `scripts/generate-test-cases.mts`, then `npm run testcases`.
6. **Verify**: `npm run typecheck`, then
   `npx playwright test --grep TC_XXX_NNN --project=chromium` (add `--project=firefox --project=webkit`
   for UI tests; `ENV=prod` if tagged `@prod`). Report real results, including failures.

## Page objects (`src/pages/`)

Each page file exports, in this order:

```ts
export const cartPageLocator = {          // <camelName>Locator: CSS selectors only
  rows: `${globalLocator.content} > tr`,  // build on globalLocator for shared markup
  total: '#totalp',
} as const;

export const cartPageTexts = {            // <camelName>Texts: everything user-visible or URL-like
  path: '/cart.html',
  placeOrderButton: 'Place Order',        // accessible names used with getByRole
  total: (amount: number) => `Total: ${amount}`,   // dynamic text as a function
  alerts: { missingFields: 'Please fill out Name and Creditcard.' },  // alert() messages
} as const;

export class CartPage extends BasePage {
  readonly total = this.page.locator(cartPageLocator.total);
  readonly placeOrderButton = this.page.getByRole('button', { name: cartPageTexts.placeOrderButton });
  readonly orderModal = new PlaceOrderModal(this.page);   // page-specific components
  ...
}
```

Rules:
- **Locators**: elements with an id/class go in the `Locator` map; buttons/links use
  `getByRole(role, { name: <Texts entry> })`. Scope inside a component's `root`
  (`this.root.getByRole(...)`). Expose stable elements as `readonly` field initializers; use a method
  for parameterised ones (`row(title)`, `productLink(title)`).
- **Shared markup** (used by 2+ pages/components) goes in `src/pages/global.ts`
  (`globalLocator` / `globalTexts`), e.g. `#tbodyid`, `.modal-footer`, `Close`.
- **Pages** extend `BasePage` (gives `nav: NavBar` and `loginModal`). **Components** (modals, popups,
  navbar) live in `src/pages/components/`, extend `BaseComponent`, have a `root` locator, and are
  exposed by `BasePage` if on every page, otherwise by the page that owns them.
- **`goto()`** navigates via the `Texts.path` and waits for a ready signal (first card, title,
  `/viewcart` response). Take an `expectedItems`-style argument when content renders asynchronously.
- **`open<Modal>()`** clicks the trigger, waits for the modal to be visible, and returns the component.
- **Alerts**: DemoBlaze reports outcomes with native `alert()`. Any action that raises one goes through
  `acceptDialog(page, () => click())` from `src/utils/dialog.ts` and returns the message. Name the
  failure variant `<action>ExpectingAlert()`. Never await a click and a dialog with `Promise.all`.
- **Values**: return parsed data, not raw text (`priceValue(): number`, `items(): CartRow[]`,
  `confirmation.read(): ConfirmationDetails`). Put waiting/polling (`expect(...).toPass()`) inside the
  page method so specs stay declarative.
- Short JSDoc on non-obvious methods explaining *why* (site quirks), matching existing density.

## Fixtures (`src/fixtures/`)

- Specs import `{ expect, test }` from `src/fixtures` (UI/E2E/perf) or `src/fixtures/api` (API only).
  Never import from `@playwright/test` in a spec.
- New page object -> add a fixture in `src/fixtures/index.ts`:
  `newPage: async ({ page }, use) => use(new NewPage(page)),`. Specs request it by name; don't
  `new` page objects in specs (exception: an extra `browser.newContext()`).
- Pick the right existing fixture:

| Need | Fixture |
| --- | --- |
| Isolated guest cart (auto for every UI test) | `guestCookie` |
| Seed/inspect data fast, without UI | `api` (`src/api/demoblaze-api.ts`; add a method there if missing) |
| Credentials of the account | `account` |
| Account token/username, logged in once per run | `authSession` (worker-scoped; never call `api.login` yourself) |
| Logged-in browser context, no login UI | `session` (adds the `authSession` cookie to the context) |
| Change the account's server-side cart | `accountCart` (cross-process lock, cart emptied before/after) |
| Another logged-in context | `browser.newContext({ storageState: authFile })` (request `authSession` or `accountCart` first so the file exists) |

- Log in through the UI only when login is what the test checks (login specs, the E2E demo).
- Never touch the account cart without `accountCart` - it is shared by every worker and browser.

## Test data (`src/data/`)

- Products: `products.<name>` (`{ id, title, price }`); add catalogue entries there, never hard-code.
- Orders: `buildOrder(overrides)` gives a valid unique order; override fields for negative cases.
- Unique values use `Date.now()`/`randomUUID()` so parallel runs don't collide.

## Specs (`tests/`)

| Folder | Content | ID prefix |
| --- | --- | --- |
| `tests/ui/<feature>.spec.ts` | One feature through the UI | `TC_<MODULE>_NNN` (`TC_LOGIN_`, `TC_CART_`, `TC_ORDER_`) |
| `tests/e2e/*.spec.ts` | Multi-feature user journeys, with `test.step` | `TC_E2E_NNN` |
| `tests/api/*.api.spec.ts` | REST only, no browser | `API_<AREA>_NNN` |
| `tests/performance/*.perf.spec.ts` | Budgets from `env.perf` | `PERF_NNN` |

```ts
test.describe('Cart', () => {
  test(
    'TC_CART_012 removes every item one by one',
    { tag: [Tag.e2e, Tag.regression, Tag.cart, Tag.demo] },
    async ({ api, guestCookie, cartPage }) => {
      await api.addToCart({ guestCookie }, products.nexus6.id);   // arrange through the API
      await cartPage.goto(1);

      await cartPage.deleteItem(products.nexus6.title);           // act through the UI under test

      await cartPage.expectItemCount(0);                          // assert
    },
  );
});
```

- **Title**: `'<ID> <behaviour in lower case, present tense>'`.
- **Tags**: see the next section - every `test()` carries its own complete tag array.
- **Assertions**: web-first `await expect(locator).toHave...()`; compare against `Texts` constants and
  `products` data, never literals (`toHaveText(navBarTexts.welcome(account.username))`).
- **Data-driven cases**: an array of `{ id, name, ... }` and a `for` loop generating one test per row
  (see the missing-field cases in `tests/ui/login.spec.ts`).
- **Known defects**: write the test for the *correct* behaviour and start it with
  `test.fail(true, 'Known defect: <what is wrong>')`; add the defect to the Defects list in
  `scripts/generate-test-cases.mts`. If the defect occurs only on some environments (or the test
  is not worth running until it is fixed), tag it `KnownBug.<env>` instead and add
  `annotation: { type: 'issue', description: '<defect id>: <what is wrong>' }`; the auto fixture
  `knownBug` skips it on that environment.
- **Negative checks** wait for a definite outcome (alert text, `submitOrder()` result), never only for
  an absence that would pass before the page reacts.
- Shared arrange steps go in `test.beforeEach` inside a nested `describe`, not copied per test.
- No `page.waitForTimeout`, no `test.only`, no retries in code - timeouts come from `.env.<ENV>`.

## Tags on every `test()`

Tags drive what runs: `playwright.config.ts` drops any test without the `@<ENV>` tag, and the npm
scripts and CI filter with `--grep @smoke`, `@cart`, `@api`, ... So tagging is part of the pattern,
not optional.

- **Put the tags on each `test()`**, as its second argument `{ tag: [...] }`. `test.describe(...)`
  carries **no** tags - a test must be self-describing when moved, copied or read alone. Use the
  three-argument multi-line layout shown above (title, `{ tag }`, body).
- **Only `Tag.*` constants** from `config/tags.ts`, never `'@smoke'` literals. A new tag is added to
  `Tag` first (and to the readme tag table).
- **Always this order**, one entry per group:

| # | Group | Values | Rule |
| --- | --- | --- | --- |
| 1 | Suite | `Tag.e2e` (UI and E2E specs), `Tag.api`, `Tag.performance` | Exactly one, matches the folder |
| 2 | Scope | `Tag.smoke`, then `Tag.regression` | `smoke` only for the critical path (a few per feature); `regression` on every functional test |
| 3 | Function | `Tag.login`, `Tag.product`, `Tag.cart`, `Tag.order` | Every feature the test exercises, e.g. logged-in cart = `login, cart` |
| 4 | Environment | `Tag.demo`, then `Tag.prod` | `demo` on **every** test, or it never runs. `prod` **only** if read-only (no add-to-cart, no purchase, no data left behind) |

```ts
{ tag: [Tag.e2e, Tag.smoke, Tag.regression, Tag.login, Tag.demo, Tag.prod] }   // UI login, safe on prod
{ tag: [Tag.e2e, Tag.regression, Tag.login, Tag.cart, Tag.demo] }              // writes the account cart
{ tag: [Tag.api, Tag.regression, Tag.product, Tag.demo, Tag.prod] }            // read-only API
{ tag: [Tag.performance, Tag.demo, Tag.prod] }                                  // perf budgets
```

- Data-driven loops put the `{ tag }` on the generated `test()` too; if rows differ (e.g. one is
  smoke), carry the tags in the row data.
- `test.fail()` known-defect tests keep their normal tags. `KnownBug.<env>` tags (from
  `config/tags.ts`) go after the environment tags, one per environment where the defect occurs.
- Check the result: `npx playwright test --list --grep "@cart"` (any tag) must list the new test, and
  `ENV=prod npx playwright test --list` must not list anything that writes data.

## Test case documentation

Add an entry to `cases` in `scripts/generate-test-cases.mts`, in ID order under its module comment:

```ts
{
  id: 'TC_CART_012',
  module: 'Cart',                 // Login | Cart | API (sheet name)
  feature: 'Delete item',
  title: 'Remove every item one by one',
  type: 'Functional',             // Functional | Negative | Edge | Security | UI/Usability
  priority: 'P2',                 // P1 critical path, P2 important, P3 minor
  preconditions: 'Guest cart contains one product',
  steps: ['Open the cart', 'Click "Delete" on the row'],
  data: 'Nexus 6',
  expected: 'Row disappears; cart is empty and the total is blank',
  automation: CART,               // spec constant at the top of the file, or 'Manual'
},
```

Then run `npm run testcases` to regenerate `docs/DemoBlaze_Test_Cases.xlsx`. If a new module or spec
file is introduced, add its constant and update the module lists in the summary/sheet loops. Update
`readme.md` if a new folder, fixture, tag or script was added.

## Pattern check before finishing

Generated tests must follow the design above. Before reporting done, check every changed file and fix
any "no":

- [ ] Specs have no CSS selectors, XPath, or user-visible string literals - all come from a page's
      `Locator`/`Texts` map, `globalLocator`/`globalTexts`, or `src/data`.
- [ ] Every new selector/text lives in the `<name>Locator` / `<name>Texts` map of the page or
      component that owns it (shared ones in `global.ts`); maps end with `as const`.
- [ ] New pages extend `BasePage`, new components extend `BaseComponent` with a `root`; both are
      exposed through a fixture or their owning page, not constructed in specs.
- [ ] Alerts are handled only through `acceptDialog` (or a page method that uses it).
- [ ] Setup/cleanup goes through `api` and fixtures; the UI is used only for the behaviour under test.
- [ ] Account cart changes use `accountCart`; logged-in tests reuse the saved session.
- [ ] Title starts with a new unique ID.
- [ ] Every new `test()` has its own `{ tag: [...] }` (none on `describe`), only `Tag.*` constants, in
      the order suite -> scope -> function -> environment, with `Tag.demo` always and `Tag.prod` only
      for read-only tests.
- [ ] The case is in `scripts/generate-test-cases.mts` with the same ID and `npm run testcases` ran.
- [ ] `npm run typecheck` passes and the new tests were run, with the results reported.

Quick self-check for leaked selectors/strings in specs:

```bash
grep -nE "locator\(|getBy(Role|Text|Label)\(|'#|\"#|toHaveText\('" tests/**/*.spec.ts
```

Hits are fine only for an extra `browser.newContext()` page or `page.evaluate`; anything else moves
into the page object.

Tag self-check (must print nothing):

```bash
grep -nE "describe\([^)]*tag:|tag: *\[?'@" tests/**/*.ts        # tags on describe, or string literals
```

And every test must carry `@demo` (otherwise it can never run):

```bash
npx playwright test --list --reporter=json 2>/dev/null | node -e 'const r=JSON.parse(require("fs").readFileSync(0));const out=[];const walk=s=>{(s.specs||[]).forEach(t=>{if(!t.tags.includes("demo"))out.push(t.file+": "+t.title+" ["+t.tags+"]")});(s.suites||[]).forEach(walk)};r.suites.forEach(walk);console.log(out.join("\n")||"OK: every test is tagged @demo")'
```
