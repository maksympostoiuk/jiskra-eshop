import { expect, test } from "@playwright/test";

test("mobile: catalog drawer, filter drawer and no horizontal scroll", async ({ page }) => {
  await page.goto("/en");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Catalog" }).click();
  await page.getByRole("button", { name: "Subcategories: Audio" }).click();
  await page.getByRole("link", { name: /^Headphones/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Headphones" })).toBeVisible();
  await page.getByRole("button", { name: "Filters" }).click();
  await page.getByRole("dialog", { name: "Filters" }).getByLabel("In stock only").check();
  await expect(page).toHaveURL(/stock=1/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
