import { env } from '../../config/env';
import { Tag } from '../../config/tags';
import type { DemoblazeApi } from '../../src/api/demoblaze-api';
import { expect, test } from '../../src/fixtures';

/**
 * Lightweight performance checks: budgets on real-browser page load timings and
 * on API latency percentiles. They catch regressions in CI; they are not a
 * substitute for a load test (use k6/JMeter/Artillery for throughput).
 * Budgets are configurable through PERF_* environment variables.
 */
test.describe('Performance budgets', () => {
  const pages = [
    { name: 'home', path: '/index.html' },
    { name: 'product', path: '/prod.html?idp_=1' },
    { name: 'cart', path: '/cart.html' },
  ];

  for (const { name, path } of pages) {
    test(
      `PERF_001 ${name} page loads within budget`,
      { tag: [Tag.performance, Tag.demo, Tag.prod] },
      async ({ page }, testInfo) => {
        await page.goto(path, { waitUntil: 'load' });
        const timing = await page.evaluate(() => {
          const [nav] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
          return {
            ttfb: Math.round(nav.responseStart - nav.startTime),
            domContentLoaded: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
            load: Math.round(nav.loadEventEnd - nav.startTime),
          };
        });
        await testInfo.attach(`${name}-timing.json`, {
          body: JSON.stringify(timing, null, 2),
          contentType: 'application/json',
        });
        testInfo.annotations.push({ type: 'timing', description: `${name}: ${JSON.stringify(timing)}` });

        expect(timing.load, `load time of ${path}`).toBeLessThan(env.perf.pageLoadBudgetMs);
      },
    );
  }

  const endpoints = [
    { name: 'GET /entries', call: (api: DemoblazeApi) => api.products() },
    { name: 'POST /view', call: (api: DemoblazeApi) => api.product(1) },
  ];

  for (const { name, call } of endpoints) {
    test(
      `PERF_002 ${name} p95 latency within budget`,
      { tag: [Tag.performance, Tag.demo, Tag.prod] },
      async ({ api }, testInfo) => {
        const durations: number[] = [];
        for (let i = 0; i < env.perf.apiSamples; i++) {
          const start = performance.now();
          await call(api);
          durations.push(performance.now() - start);
        }
        const p95 = percentile(durations, 95);
        const stats = { samples: durations.length, p50: Math.round(percentile(durations, 50)), p95: Math.round(p95) };
        await testInfo.attach(`${name}-latency.json`, {
          body: JSON.stringify(stats, null, 2),
          contentType: 'application/json',
        });
        testInfo.annotations.push({ type: 'latency', description: `${name}: ${JSON.stringify(stats)}` });

        expect(p95, `p95 latency of ${name}`).toBeLessThan(env.perf.apiP95BudgetMs);
      },
    );
  }
});

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];
}
