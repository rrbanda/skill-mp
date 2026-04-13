import { test, expect } from "@playwright/test";

test.describe("Smoke Tests", () => {
  test("homepage loads", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Skills Marketplace/i);
  });

  test("navigation links are visible", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Builder", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Browse", exact: true })).toBeVisible();
  });

  test("builder page renders", async ({ page }) => {
    await page.goto("/builder");
    await expect(page.locator("body")).toContainText(/describe/i);
  });
});
