import { expect, test } from "@playwright/test";

test.describe("storefront purchase flow", () => {
  test("browse category, filter, choose variant, add to cart and check out", async ({ page }) => {
    await page.goto("/cs");
    await expect(page.getByRole("heading", { name: "Nejprodávanější" })).toBeVisible();

    // Mega-menu → category
    await page.getByRole("button", { name: "Katalog" }).click();
    await page.locator("#catalog-menu").getByRole("link", { name: /Chytré telefony/ }).first().click();
    await expect(page.getByRole("heading", { level: 1, name: "Chytré telefony" })).toBeVisible();

    // Filter by brand → URL-synced
    await page.getByRole("complementary").getByLabel("Nordvik").check();
    await expect(page).toHaveURL(/brand=nordvik/);
    await expect(page.getByText("2 produkty").first()).toBeVisible();
    await page.getByLabel("Řadit:").selectOption("price_desc");
    await expect(page).toHaveURL(/sort=price_desc/);

    // Product page
    await page.getByRole("link", { name: "Nordvik Aurora 8 Pro" }).first().click();
    await expect(page.getByRole("heading", { level: 1, name: "Nordvik Aurora 8 Pro" })).toBeVisible();

    // Variant: colour + storage update SKU and price
    await page.getByRole("button", { name: /^Stříbrná/ }).click();
    await page.getByRole("button", { name: /^1 TB/ }).click();
    await expect(page.getByText("NV-AUR8P-SIL-1TB")).toBeVisible();
    await expect(page.locator("#buy").getByText("31 990 Kč").first()).toBeVisible();
    await page.getByRole("button", { name: /^Stříbrná/ }).click(); // no-op re-select keeps the variant

    await page.getByRole("button", { name: "Přidat do košíku" }).click();
    await expect(page.getByRole("link", { name: /Košík \(1 ks\)/ })).toBeVisible();

    // Cart
    await page.goto("/cs/cart");
    await expect(page.getByText("Nordvik Aurora 8 Pro")).toBeVisible();
    await page.getByRole("button", { name: "Zvýšit množství" }).click();
    await expect(page.getByText("63 980 Kč").first()).toBeVisible();
    await page.getByRole("link", { name: "Pokračovat k objednávce" }).click();

    // Checkout: validation first
    await expect(page.getByRole("heading", { level: 1, name: "Objednávka" })).toBeVisible();
    await page.getByRole("button", { name: "Odeslat objednávku" }).click();
    await expect(page.getByText("Zkontrolujte prosím zvýrazněná pole.")).toBeVisible();

    await page.locator("#email").fill("e2e@example.com");
    await page.locator("#phone").fill("+420 777 123 456");
    await page.locator("#firstName").fill("Eva");
    await page.locator("#lastName").fill("Testovací");
    await page.locator("#street").fill("Krátká 1");
    await page.locator("#city").fill("Praha");
    await page.locator("#zip").fill("110 00");
    await page.locator("#main").getByText("Kurýr na adresu").click();
    await page.locator("#main").getByText("Bankovní převod", { exact: true }).click();
    await page.getByLabel(/Souhlasím s obchodními podmínkami/).check();
    await page.getByRole("button", { name: "Odeslat objednávku" }).click();

    await expect(page).toHaveURL(/\/cs\/order\/\d+\?token=/);
    await expect(page.getByRole("heading", { name: "Děkujeme za objednávku!" })).toBeVisible();
    await expect(page.getByText("Variabilní symbol")).toBeVisible();
    await expect(page.getByText("63 980 Kč").first()).toBeVisible();
    // Cart is emptied
    await expect(page.getByRole("link", { name: /Košík \(0 ks\)/ })).toBeVisible();
  });

  test("language and currency are independent", async ({ page }) => {
    await page.goto("/cs/product/halvo-studio-anc");
    await page.getByRole("group", { name: "Měna" }).getByRole("button", { name: "USD" }).click();
    await expect(page.locator("#buy").getByText(/\$\d/).first()).toBeVisible();
    await page.getByRole("group", { name: "Jazyk" }).getByRole("link", { name: "en" }).click();
    await expect(page).toHaveURL(/\/en\/product\/halvo-studio-anc/);
    await expect(page.getByRole("button", { name: "Add to cart" })).toBeVisible();
    await expect(page.locator("#buy").getByText(/\$\d/).first()).toBeVisible();
  });

  test("search suggestions lead to products", async ({ page }) => {
    await page.goto("/en");
    await page.getByRole("combobox").fill("halvo");
    await expect(page.getByRole("option", { name: /Halvo Studio ANC/ })).toBeVisible();
    await page.getByRole("combobox").press("Enter");
    await expect(page).toHaveURL(/\/en\/search\?q=halvo/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("halvo");
  });
});
