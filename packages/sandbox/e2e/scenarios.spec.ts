import { expect, type Locator, type Page, test } from '@playwright/test';
import { routes, type ScenarioRoute as Route } from '../app/scenarios/routes';

/** Marks the page's current section so a soft navigation proves it swapped in a new one. */
const STALE = 'data-stale';
const SECTION = `[data-scenario]:not([${STALE}])`;

/**
 * True when a navigation that keeps earlier styles cannot assert the route's probe colors; records
 * the route's reason as an annotation. The index holds no conflicting styles, so it skips only when
 * the route says so.
 */
function skipsColorsOnSoft(route: Route, from: 'index' | 'page'): boolean {
  const { hardLoadOnly } = route;
  if (hardLoadOnly === undefined) return false;
  if (from === 'index' && !hardLoadOnly.fromIndex) return false;

  test.info().annotations.push({ description: hardLoadOnly.reason, type: 'hard-load-only' });
  return true;
}

const urlOf = (route: Route) => `/scenarios/${route.href}`;

/** Every `[data-expected]` element reaches its value; waits for late boundaries by retrying. */
async function expectProbes(
  page: Page,
  route: Route,
  { js, skipColors = false }: { js: boolean; skipColors?: boolean }
) {
  const section = page.locator(SECTION);
  await expect(section).toBeVisible();
  await expect(section.locator('style')).toHaveCount(0);

  if (js) {
    await expect(page.getByText(/^loading/)).toHaveCount(0);
  }

  // Page-wide: without JavaScript a late boundary's content stays in a hidden node outside the section.
  const probes = page.locator(`[data-expected]:not([${STALE}])`);

  const expectsNoProbes = route.noProbes || (!js && route.jsOnly);

  if (expectsNoProbes) {
    await expect(probes).toHaveCount(0);
    return;
  }

  await expect(probes).not.toHaveCount(0);

  if (skipColors) return;

  const expectations = await probes.evaluateAll(elements =>
    elements.map(element => ({
      expected: element.getAttribute('data-expected') ?? '',
      property: element.getAttribute('data-expected-property') ?? 'color',
    }))
  );

  for (const [index, { expected, property }] of expectations.entries()) {
    await expect(probes.nth(index)).toHaveCSS(property, expected);
  }
}

const markStale = (page: Page) =>
  page.evaluate(attr => {
    for (const element of document.querySelectorAll('[data-scenario], [data-expected]')) {
      element.setAttribute(attr, '');
    }

    Object.assign(window, { softMarker: true });
  }, STALE);

/** Clicks only after React attached to the link; an earlier click would be a hard navigation. */
async function softClick(page: Page, link: Locator) {
  await expect
    .poll(() => link.evaluate(el => Object.keys(el).some(key => key.startsWith('__reactProps'))))
    .toBe(true);
  await markStale(page);
  await link.click();
}

const expectStillSoft = async (page: Page) =>
  expect(await page.evaluate(() => 'softMarker' in window)).toBe(true);

const indexLink = (page: Page, route: Route) => page.locator(`ul a[href="${urlOf(route)}"]`);

const layoutLink = (page: Page, route: Route) =>
  page.locator(`nav[aria-label="Scenarios"] a[href="${urlOf(route)}"]`);

test.describe('scenario pages', () => {
  test.describe('JavaScript off', () => {
    test.use({ javaScriptEnabled: false });

    test('the browser really runs without scripts', async ({ page }) => {
      await page.goto(
        'data:text/html,<p id=state>off</p><script>document.getElementById("state").textContent="on"</script>'
      );
      await expect(page.locator('#state')).toHaveText('off');
    });

    for (const route of routes) {
      test(`${route.href} hard from server HTML alone`, async ({ page }) => {
        await page.goto(urlOf(route));
        await expectProbes(page, route, { js: false });
      });
    }
  });

  for (const [index, route] of routes.entries()) {
    const previous = routes[(index + routes.length - 1) % routes.length];

    test.describe(route.href, () => {
      test('hard load', async ({ page }) => {
        await page.goto(urlOf(route));
        await expectProbes(page, route, { js: true });
      });

      test('soft from the index', async ({ page }) => {
        await page.goto('/scenarios');
        await softClick(page, indexLink(page, route));
        await expect(page).toHaveURL(urlOf(route));
        await expectProbes(page, route, {
          js: true,
          skipColors: skipsColorsOnSoft(route, 'index'),
        });
        await expectStillSoft(page);
      });

      test(`soft from ${previous.href}, then back`, async ({ page }) => {
        await page.goto(urlOf(previous));
        await expectProbes(page, previous, { js: true, skipColors: true });
        await softClick(page, layoutLink(page, route));
        await expect(page).toHaveURL(urlOf(route));
        await expectProbes(page, route, { js: true, skipColors: skipsColorsOnSoft(route, 'page') });
        await expectStillSoft(page);

        await markStale(page);
        await page.goBack();
        await expect(page).toHaveURL(urlOf(previous));
        await expectProbes(page, previous, {
          js: true,
          skipColors: skipsColorsOnSoft(previous, 'page'),
        });
        await expectStillSoft(page);
      });
    });
  }
});

/**
 * Each in-page check page reports its own pass or fail through `data-check`: the summary, every
 * section indicator, and every rule-count badge (which sets it once it has counted).
 */
test.describe('in-page check pages', () => {
  /** The summary, 11 section indicators, and the repeated-global count badge. */
  const RSC_CHECKS = 13;
  /** The composite summary, the autopilot result box, and the client dedup count badge. */
  const GLOBAL_STYLE_CHECKS = 3;

  /** The autopilot runs its steps one after another, so its checks appear last. */
  const AUTOPILOT_TIMEOUT_MS = 60_000;

  async function expectAllPass(page: Page, checks: number, timeout?: number) {
    await expect(page.locator('[data-check]')).toHaveCount(checks, { timeout });
    await expect(page.locator('[data-check]:not([data-check="pass"])')).toHaveCount(0);
  }

  test('/rsc hard', async ({ page }) => {
    await page.goto('/rsc');
    await expectAllPass(page, RSC_CHECKS);
  });

  test('/rsc soft from /', async ({ page }) => {
    await page.goto('/');
    await softClick(page, page.locator('a[href="/rsc"]'));
    await expect(page).toHaveURL('/rsc');
    await expectAllPass(page, RSC_CHECKS);
    await expectStillSoft(page);
  });

  test('/global-style-test hard', async ({ page }) => {
    await page.goto('/global-style-test');
    await expectAllPass(page, GLOBAL_STYLE_CHECKS, AUTOPILOT_TIMEOUT_MS);
  });

  test('/global-style-test soft from /', async ({ page }) => {
    await page.goto('/');
    await softClick(page, page.locator('a[href="/global-style-test"]'));
    await expect(page).toHaveURL('/global-style-test');
    await expectAllPass(page, GLOBAL_STYLE_CHECKS, AUTOPILOT_TIMEOUT_MS);
    await expectStillSoft(page);
  });
});
