import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

const STATUS_ROUTE = "**/api/v1/status";
const WIPE_ROUTE = "**/api/v1/actions/wipe-inventory";

const buildStatusResponse = (demo: boolean) => ({
  allowRegistration: true,
  build: { buildTime: new Date().toISOString(), commit: "test", version: "v0.0.0" },
  demo,
  health: true,
  labelPrinting: false,
  latest: { date: new Date().toISOString(), version: "v0.0.0" },
  message: "",
  oidc: { allowLocal: true, autoRedirect: false, buttonText: "", enabled: false },
  title: "Homebox",
  versions: [],
});

async function mockStatus(page: Page, demo: boolean) {
  await page.route(STATUS_ROUTE, route => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(buildStatusResponse(demo)),
    });
  });
}

async function login(page: Page, email = "demo@example.com", password = "demodemo") {
  await page.goto("/locations");
  await expect(page).toHaveURL("/");
  await page.fill("input[type='text']", email);
  await page.fill("input[type='password']", password);
  await page.click("button[type='submit']");
  await expect(page).toHaveURL("/locations");
}

async function openWipeInventory(page: Page) {
  await page.goto("/tools");
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

  const wipeButton = page.getByRole("button", { name: "Wipe Inventory" }).last();
  await expect(wipeButton).toBeVisible();
  await wipeButton.click();
}

test.describe.skip("Wipe Inventory", () => {
  test("shows demo mode warning without wipe options", async ({ page }) => {
    await mockStatus(page, true);
    await login(page);
    await openWipeInventory(page);

    await expect(
      page.getByText("The complete inventory, including templates, cannot be wiped while Homebox is in demo mode.", {
        exact: false,
      })
    ).toBeVisible();

    await expect(page.locator("#wipe-inventory-confirmation-checkbox")).toHaveCount(0);
  });

  test.describe.skip("production mode", () => {
    test.beforeEach(async ({ page }) => {
      await mockStatus(page, false);
      await login(page);
    });

    test.skip("requires the irreversible operation confirmation", async ({ page }) => {
      await page.route(WIPE_ROUTE, route => {
        route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ completed: 0 }) });
      });

      await openWipeInventory(page);
      await expect(page.getByText("Wipe Inventory").first()).toBeVisible();

      const confirmation = page.locator("#wipe-inventory-confirmation-checkbox");
      const confirmButton = page.getByRole("button", { name: "Confirm" }).last();
      await expect(confirmation).toBeVisible();
      await expect(confirmButton).toBeDisabled();
      await confirmation.click();
      await expect(confirmButton).toBeEnabled();

      const requestPromise = page.waitForRequest(WIPE_ROUTE);
      await confirmButton.click();
      await requestPromise;

      await expect(page.locator("[role='status']").first()).toBeVisible();
    });

    test.skip("blocks wipe attempts from non-owners", async ({ page }) => {
      await page.route(WIPE_ROUTE, route => {
        route.fulfill({
          status: 403,
          contentType: "application/json",
          body: JSON.stringify({ message: "forbidden" }),
        });
      });

      await openWipeInventory(page);

      await page.locator("#wipe-inventory-confirmation-checkbox").click();
      const requestPromise = page.waitForRequest(WIPE_ROUTE);
      await page.getByRole("button", { name: "Confirm" }).last().click();
      await requestPromise;

      await expect(page.getByText("Failed to wipe inventory.")).toBeVisible();
    });
  });
});
