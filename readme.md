# DemoBlaze QA Automation Challenge

An end-to-end test automation framework for [DemoBlaze](https://www.demoblaze.com), built with **Playwright + TypeScript**. It covers the **Login** and **Cart / Place order** features.

| Deliverable | Location |
| --- | --- |
| Test case suite (Excel) | [`docs/DemoBlaze_Test_Cases.xlsx`](docs/DemoBlaze_Test_Cases.xlsx): 63 cases and a defect log |
| Automation framework | this repository |
| Demo script: log in, add to cart, place order | [`tests/e2e/login-and-place-order.spec.ts`](tests/e2e/login-and-place-order.spec.ts) |
| CI pipeline: on push to `main`, a daily schedule and on demand | [`.github/workflows/playwright.yml`](.github/workflows/playwright.yml), see [CI](#ci-github-actions) |
| Slack notification after every CI run | [`scripts/notify-slack.mts`](scripts/notify-slack.mts), see [Slack notification](#slack-notification) |

---

## Quick start

Prerequisites: Node.js 20 or later (22 recommended) and a registered DemoBlaze account.

```bash
npm ci
npx playwright install --with-deps      # browsers + OS dependencies
cp .env.example .env.demo               # then set DEMO_USERNAME / DEMO_PASSWORD
cp .env.example .env.prod               # optional: only needed to run against prod
```

Each environment has its own file, `.env.demo` or `.env.prod`, and `ENV` picks which one is loaded (default `demo`). There is no plain `.env` file. See [Configuration](#configuration).

Run the demo and the full suite:

```bash
npm run test:e2e        # browser suites (UI + the login → cart → order demo) on Chromium
npm test                # everything on Chromium: API + UI/E2E + performance
npm run test:all-browsers  # everything, UI/E2E on Chromium, Firefox and WebKit
npm run report          # open the HTML report
```

Other entry points:

| Command | What runs |
| --- | --- |
| `npm run test:smoke` | Critical-path tests tagged `@smoke` |
| `npm run test:regression` | Full functional regression (`@regression`) |
| `npm run test:login` / `test:product` / `test:cart` / `test:order` | One function, across all suites |
| `npm run test:demo` / `test:prod` | Everything allowed on that environment |
| `npm run test:ui` | UI + E2E on Chromium, Firefox and WebKit |
| `npm run test:chromium` / `test:firefox` / `test:webkit` | UI + E2E on one engine |
| `npm run test:api` | REST API tests (no browser) |
| `npm run test:perf` | Page-load and API latency budgets |
| `npm run test:headed` | Chromium, browser visible |
| `npm run typecheck` | TypeScript type-check |
| `npm run lint` / `lint:fix` | ESLint: TypeScript and Playwright rules, plus a maximum line length of 120 characters |
| `npm run format` / `format:check` | Prettier formatting (wraps code at 120 characters) |
| `npm run testcases` | Rebuild the Excel test case suite |

Any Playwright CLI option also works, for example `npx playwright test --grep TC_LOGIN_002 --debug` or `npx playwright test --ui`.

### Tags

All tags are defined in [config/tags.ts](config/tags.ts).

| Group | Tags | Meaning |
| --- | --- | --- |
| Suite | `@api`, `@e2e`, `@performance` | REST API tests (`tests/api`), browser tests (`tests/ui`, `tests/e2e`), budgets (`tests/performance`) |
| Scope | `@smoke`, `@regression` | Critical path / full regression |
| Function | `@login`, `@product`, `@cart`, `@order` | Feature under test |
| Environment | `@demo`, `@prod` | Where a test may run. Every test runs on `demo`; only read-only tests that leave no data behind (login, product API, empty cart, performance) are tagged `@prod` |

The environment tag is applied automatically: `playwright.config.ts` only runs tests tagged with the current `ENV`, so `ENV=prod` can never place an order. Combine the other tags with regex lookaheads:

```bash
npx playwright test --grep "^(?=.*@api)(?=.*@cart)"             # API cart tests on demo
ENV=prod npx playwright test --grep "^(?=.*@e2e)(?=.*@login)"   # UI login tests on prod
```

---

## Configuration

Settings are resolved in [`config/env.ts`](config/env.ts). Each environment has its own file, created from the template [`.env.example`](.env.example):

| File | Loaded when | Contains |
| --- | --- | --- |
| `.env.demo` | `ENV=demo`, or `ENV` not set | URLs, the test account and runner settings for the demo environment |
| `.env.prod` | `ENV=prod` | The same keys for prod |

Earlier sources in this list win:

1. Real environment variables, such as CI secrets or `HEADLESS=false npm test`
2. `.env.<ENV>`
3. The defaults in the table, so a missing file or variable still gives a working run

`ENV` is read before any file is loaded, so it has to be set on the command line. Writing `ENV=prod` inside `.env.demo` does not switch environments.

```bash
npm run test:demo          # loads .env.demo (same as plain `npm test`)
npm run test:prod          # loads .env.prod
npm run test:prod:smoke    # smoke tests on prod
ENV=prod npm run test:api  # any script on prod
ENV=demo npx playwright test --grep "^(?=.*@cart)(?=.*@smoke)"   # one environment + tags
ENV=demo HEADLESS=false WORKER=1 npx playwright test --grep TC_E2E_001   # override one run
```

> `ENV=… command` works in macOS and Linux shells. In PowerShell use `$env:ENV="prod"; npx playwright test`, and in cmd use `set ENV=prod && npx playwright test`.

| Variable | Default | Purpose |
| --- | --- | --- |
| `ENV` | `demo` | Target environment, `demo` or `prod`. Selects the `@demo`/`@prod` tests and the `.env.<ENV>` file. Set it on the command line, not in the file. |
| `BASE_URL` | `https://www.demoblaze.com` | Web app under test |
| `API_URL` | `https://api.demoblaze.com` | REST API under test |
| `DEMO_USERNAME`, `DEMO_PASSWORD` | – | The registered test account |
| `HEADLESS` | `true` | `false` shows the browser |
| `BROWSERS` | `chromium` | Engines for the UI/E2E suites, comma separated: `chromium`, `firefox`, `webkit`. CI uses all three. |
| `WORKER` | `1` | Parallel workers, a count or a share of cores (`50%`). CI sets `2`. `--workers` on the CLI still wins. |
| `TEST_TIMEOUT_MS` | `60000` | Timeout for a whole test |
| `EXPECT_TIMEOUT_MS` | `10000` | Timeout for each `expect()` assertion |
| `ACTION_TIMEOUT_MS` | `15000` | Timeout for each action (click, fill, …) |
| `NAVIGATION_TIMEOUT_MS` | `30000` | Timeout for each navigation (goto, reload) |
| `PERF_PAGE_LOAD_BUDGET_MS` | `8000` | Maximum page `load` time |
| `PERF_API_P95_BUDGET_MS` | `3000` | Maximum p95 API latency |
| `PERF_API_SAMPLES` | `10` | Requests sampled per endpoint |

> The credentials use `DEMO_USERNAME` and `DEMO_PASSWORD` instead of `USERNAME` and `PASSWORD` on purpose. Windows and zsh already define `USERNAME` as the OS user, and that value would silently override the one in `.env.<ENV>`.

`.env.demo` and `.env.prod` hold credentials, so they are git-ignored. Only the template `.env.example` is committed. On CI the same values come from GitHub environment secrets instead of files.

---

## Framework structure

```
├── config/
│   ├── env.ts                      # typed config: .env.<ENV> loading, defaults, credentials
│   ├── tags.ts                     # every tag a test may use
│   └── global-setup.ts             # runs once per run: resets the saved account session
├── src/
│   ├── api/
│   │   └── demoblaze-api.ts        # REST client (login, products, cart)
│   ├── pages/                      # Page Object Model
│   │   ├── global.ts               # locators and texts shared by several pages
│   │   ├── base-page.ts            # shared navbar + login modal
│   │   ├── home-page.ts
│   │   ├── product-page.ts
│   │   ├── cart-page.ts
│   │   └── components/             # reusable UI parts
│   │       ├── base-component.ts
│   │       ├── nav-bar.ts
│   │       ├── login-modal.ts
│   │       ├── place-order-modal.ts
│   │       └── order-confirmation.ts
│   ├── fixtures/
│   │   ├── api.ts                  # browser-less fixtures: api, account, authSession, accountCart
│   │   ├── auth-session.ts         # logs in once per run, only when a test needs it
│   │   └── index.ts                # UI fixtures: page objects, guest cart, session
│   ├── data/                       # test data: products, order builder
│   └── utils/
│       ├── dialog.ts               # native alert() handling
│       └── account-lock.ts         # cross-process locks (account cart, login)
├── tests/
│   ├── ui/                         # login, cart, place-order (functional, negative, edge)
│   ├── e2e/                        # the challenge demo flow
│   ├── api/                        # REST API tests
│   └── performance/                # page-load + latency budgets
├── scripts/generate-test-cases.mts # builds docs/DemoBlaze_Test_Cases.xlsx
├── docs/DemoBlaze_Test_Cases.xlsx
├── .env.example                    # template for .env.demo / .env.prod (git-ignored)
├── playwright.config.ts            # projects, reporters, timeouts, artefacts
├── eslint.config.mjs               # lint rules, incl. 120-character line limit
├── .prettierrc.json                # formatting, same 120-character width
└── .github/workflows/playwright.yml
```

### Design decisions

**Layers.** Specs describe behaviour. Page objects and components own selectors and interactions. Fixtures own setup and teardown. Configuration lives in one module. When the UI changes, only the page object has to change.

**Components inside page objects.** The navbar and the login modal appear on every page, so they are components shared through `BasePage`. The place-order modal and the confirmation popup are components of `CartPage`.

**Locator and text maps.** Each page or component file starts with two exported objects: `<name>Locator` holds its CSS selectors and `<name>Texts` holds its UI copy (button labels, page paths, alert messages). Selectors used by several pages, such as the `#tbodyid` content container and the modal footer, live in [`src/pages/global.ts`](src/pages/global.ts). Specs assert against the `Texts` objects, so a changed message is updated in one place. Inside the class, a locator becomes a field only when a spec checks it, it is a chained or role-based locator, or several methods use it. Everything else is written inline in the method that uses it.

```ts
export const cartPageLocator = { rows: `${globalLocator.content} > tr`, total: '#totalp' } as const;
export const cartPageTexts = { path: '/cart.html', placeOrderButton: 'Place Order' } as const;

export class CartPage extends BasePage {
  readonly rows = this.page.locator(cartPageLocator.rows);
  readonly placeOrderButton = this.page.getByRole('button', { name: cartPageTexts.placeOrderButton });
  // ... methods: goto(), items(), deleteItem(), ...
}
```

**Fixtures instead of `beforeEach` boilerplate.** Specs ask for what they need, for example `({ productPage, cartPage, api })`. Playwright creates only those objects and tears them down afterwards.

**Log in once per run.** The worker-scoped `authSession` fixture ([`src/fixtures/auth-session.ts`](src/fixtures/auth-session.ts)) logs the account in the first time a test needs it and saves the browser storage state to `playwright/.auth/user.json` (git-ignored). [`config/global-setup.ts`](config/global-setup.ts) deletes the file at the start of each run, so every run logs in afresh. Tests that need a session reuse it through the `session` and `accountCart` fixtures or `browser.newContext({ storageState: authFile })` instead of logging in again. DemoBlaze returns the same token on every login, and logging out only clears the cookie, so the login tests' own UI logins do not invalidate the saved state. The login tests and the demo flow still log in through the UI, because login is what they test.

**The API is used for setup, the UI is used for what is under test.** Seeding a cart through the API, and reusing the saved session (the `session` fixture), keeps UI tests fast and focused. For example, the delete-item test does not depend on add-to-cart working. The demo flow is the exception: it does everything through the UI, because that is what it demonstrates.

**Test isolation on a shared public site.**
- *Guest carts:* DemoBlaze keys a guest cart by a `user=<uuid>` cookie. The auto fixture `guestCookie` gives every browser context its own id, so guest cart tests run fully in parallel on all browsers. Without it, a page opened directly by URL has no cookie, and all such tests would share one cart.
- *The registered account's cart* is stored on the server and shared by every session, and a purchase empties it. Tests that change it request the `accountCart` fixture. The fixture takes a cross-process lock, which serialises them across workers and browser projects, and empties the cart before and after each test.

**Reliable handling of `alert()`.** DemoBlaze reports most outcomes through native alerts, some of them synchronous. `acceptDialog()` registers the listener before the action and accepts the dialog inside the listener, which avoids the deadlock you get by awaiting the click and the dialog together. Negative order checks wait for a definite outcome (a confirmation or a rejection alert) instead of asserting that something is absent, so they cannot pass before the page has reacted.

**Known defects are executable.** Defects found during analysis are written as tests of the correct behaviour and marked `test.fail()`, for example "an empty cart cannot be purchased". The suite stays green, the defect is documented in the report, and the test turns red once the defect is fixed, which tells you to remove the annotation.

**Traceability.** Test IDs (`TC_LOGIN_001`, `TC_ORDER_010`, …) are the same in the specs and in the Excel suite. The workbook is generated from code, so it stays in step with the tests.

**Tags on each test.** Every `test()` carries its full tag list (suite, scope, function, environment) instead of inheriting tags from `test.describe`, so each test shows on its own where and when it runs.

**Code quality.** ESLint checks TypeScript and Playwright rules and fails on lines longer than 120 characters. Prettier wraps code at the same width, so `npm run format` fixes most long lines. CI runs `typecheck`, `lint` and `format:check` before the tests.

### Requirement coverage

| Requirement | How it is met |
| --- | --- |
| Cross-browser / platform | Projects for Chromium, Firefox and WebKit (Safari engine), Chromium by default (`BROWSERS`). Runs on Linux, macOS and Windows. |
| Modular, scalable design | Page objects + components, fixtures, data builders, API client. A new page or feature is one more page object and one more spec file. |
| CI/CD | GitHub Actions: on push to `main`, a daily smoke run, and on demand with environment, suite, feature, scope and browser inputs. Credentials come from GitHub environment secrets. Reports are uploaded as artefacts, and every run posts its result to Slack. The suite is a plain `npx playwright test`, so Jenkins and GitLab only need `npm ci && npx playwright install --with-deps && npx playwright test`. See [CI](#ci-github-actions). |
| Configurable parameters | `.env.demo` / `.env.prod` selected by `ENV`, overridable by environment variables; see [Configuration](#configuration). |
| Reporting | Everything a run produces is in `playwright-report/`: HTML report (`html/`, open with `npm run report`), JUnit XML (`junit.xml`) for CI dashboards, JSON (`results.json`), and the screenshot, video and Playwright trace of each failure (`test-results/`). GitHub annotations on CI, and a Slack summary after every CI run. |
| Test types | **UI** (`tests/ui`), **E2E** (`tests/e2e`), **API** (`tests/api`), **performance** (`tests/performance`), **regression / smoke** through `@regression` and `@smoke` tags; see [Tags](#tags). |

### Performance tests

`tests/performance` checks budgets rather than load. It records Navigation Timing in a real browser (TTFB, DOMContentLoaded, load) and p50/p95 latency of key API endpoints, and attaches the numbers to the report. This catches performance regressions on every CI run. Throughput and load testing belong in a dedicated tool such as k6 or JMeter, which can reuse `src/api/demoblaze-api.ts` as a reference for the endpoints.

---

## CI (GitHub Actions)

The workflow [`.github/workflows/playwright.yml`](.github/workflows/playwright.yml) runs the suite, publishes the reports and posts the result to Slack.

### When it runs

| Trigger | When | What runs |
| --- | --- | --- |
| Push | Every push to `main` | Everything on `demo`: API, UI/E2E on Chromium, Firefox and WebKit, performance |
| Schedule | Every day at 08:00 Vietnam time (01:00 UTC) | Smoke tests (`@smoke`) on `demo`, all suites and browsers |
| Manual | *Actions → E2E tests → Run workflow* | What you choose (see below) |

Opening or updating a pull request does not start the workflow. To test a branch before merging, start a manual run on it: choose the branch in *Run workflow*.

A manual run lets you choose:

| Input | Options | Default |
| --- | --- | --- |
| Environment | `demo`, `prod` | `demo` |
| Suite | `all`, `api`, `e2e`, `performance` | `all` |
| Feature | `all`, `login`, `product`, `cart`, `order` | `all` |
| Scope | `all`, `smoke`, `regression` | `all` |
| Browsers | Any of `chromium firefox webkit` | All three |
| Extra filter | Any `--grep` text, e.g. `TC_LOGIN_002` | None |

The inputs are combined into tag filters, so for example *Feature `cart` + Scope `smoke`* runs only tests tagged both `@cart` and `@smoke`. On `prod` only tests tagged `@prod` run.

### Scheduled run

The daily run checks every morning that the critical paths still work on the live demo site, even when no code has changed. It runs the `@smoke` tests on `demo` across all suites and browsers, and its result arrives in Slack like any other run. To change the time, edit the `cron` line in the workflow. GitHub cron times are in UTC and can start a few minutes late when GitHub is busy.

### What a run does

1. Installs dependencies, then checks the code with `npm run typecheck`, `npm run lint` and `npm run format:check`.
2. Works out the Playwright projects and the `--grep` filter from the trigger and inputs.
3. Installs only the browsers that the run needs.
4. Runs the tests with 2 workers. Failed tests are retried up to 2 times, to absorb the instability of the public demo site.
5. Uploads the reports as the artefact `playwright-reports-<env>`, kept for 14 days.
6. Posts the result to Slack (see below).

All browsers run in one job on purpose. The account-cart lock works per machine, so splitting browsers across parallel jobs would let them collide on the shared account.

### Slack notification

Every run, whether it passed, failed or was cancelled, ends with a message in the Slack channel. [`scripts/notify-slack.mts`](scripts/notify-slack.mts) builds it from the JSON report. The message contains:

- A mention of `SLACK_MENTION_USER_ID`, so the person gets a push notification
- The status (passed, failed or cancelled), also shown as the card colour (green, red or grey)
- Test counts (passed, failed, flaky, skipped) and how long the run took
- Up to 10 failed tests, as `[browser] test title`
- The run details: environment, suite, feature, scope, browsers, branch, commit, trigger and who started it
- **Open test run** and **Download report** buttons

If the run stops before the tests (for example on a lint error), the message says that no test results were produced. The notification never fails the job: a missing token or channel, or a bot that isn't in the channel, only logs a warning in the run.

To preview the message without sending it:

```bash
SLACK_DRY_RUN=1 node scripts/notify-slack.mts
```

### Setup

Add these under the repository *Settings*:

| Name | Kind | Where | Purpose |
| --- | --- | --- | --- |
| `DEMO_USERNAME`, `DEMO_PASSWORD` | Secret | *Environments → `demo`* and *`prod`* | The test account. These replace `.env.demo` / `.env.prod` on CI. |
| `BASE_URL`, `API_URL` | Variable (optional) | *Environments → `demo`* and *`prod`* | Only needed if they differ from the defaults |
| `SLACK_BOT_TOKEN` | Secret | *Secrets and variables → Actions* | Slack bot token. The bot needs the `chat:write` scope. |
| `SLACK_CHANNEL_ID` | Variable | *Secrets and variables → Actions → Variables* | Channel to post in, e.g. `C0123456789`. Invite the bot to it with `/invite @bot-name`. |
| `SLACK_MENTION_USER_ID` | Variable (optional) | *Secrets and variables → Actions → Variables* | Who to mention. Defaults to `U06AG118M5K`. |

To find a channel ID in Slack, open the channel, click its name, and look at the bottom of the *About* tab. A member ID is under *View full profile → ⋮ → Copy member ID*.

### Reports

Download the `playwright-reports-<env>` artefact (for example `playwright-reports-demo`) from the run page, or use the **Download report** button in Slack. Then open `playwright-report/html/index.html`. Failed tests include their screenshot, video and Playwright trace.

---

## Test case suite

[`docs/DemoBlaze_Test_Cases.xlsx`](docs/DemoBlaze_Test_Cases.xlsx) has these sheets:

- **Summary**: case counts by module, type and automation status
- **Login** (20), **Cart & Order** (29), **API** (14): ID, feature, title, type (functional, negative, edge, security, UI), priority, preconditions, steps, data, expected result, automated spec or "Manual", notes
- **Defects**: issues found, with steps to reproduce

### Defects found

| ID | Severity | Defect |
| --- | --- | --- |
| D-02 | High | An empty cart can be purchased ("Amount: 0 USD") |
| D-03 | High | The credit card number is not validated (any text is accepted) |
| D-04 | High | The auth token is predictable: `base64(username + expiry)` |
| D-01 | Medium | The purchase confirmation shows the month one behind (zero-based `getMonth()`) |
| D-05 | Medium | Card expiry month and year are not validated |
| D-06 | Low | The "Product added" alert text differs between guest and logged-in users |
| D-07 | Low | The guest cart is not merged into the user cart on login (confirm the requirement) |
