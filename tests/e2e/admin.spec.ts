import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email = "admin@jiskra.local", password = "e2e-admin-password") {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Heslo").fill(password);
  await page.getByRole("button", { name: "Přihlásit se" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Přehled" })).toBeVisible();
}

test.describe("CMS", () => {
  test("rejects wrong credentials", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("E-mail").fill("admin@jiskra.local");
    await page.getByLabel("Heslo").fill("wrong-password");
    await page.getByRole("button", { name: "Přihlásit se" }).click();
    await expect(page.getByText("Nesprávný e-mail nebo heslo.")).toBeVisible();
  });

  test("admin edits a product and the storefront shows the change", async ({ page }) => {
    await login(page);
    await page.getByRole("link", { name: "Produkty" }).first().click();
    await page.getByPlaceholder("Název, značka nebo SKU").fill("glide");
    await page.getByRole("button", { name: "Filtrovat" }).click();
    await page.getByRole("link", { name: "Quill Glide Mouse", exact: true }).click();

    await page.getByRole("tab", { name: "Angličtina" }).click();
    await page.locator('input[id="translations.en.name"]').fill("Quill Glide Mouse Pro");
    // Slug of an existing product stays stable
    await expect(page.locator('input[id="translations.en.slug"]')).toHaveValue("quill-glide-mouse");

    // Change price and fill USD from CZK
    await page.locator('input[id="variants.0.price-czk"]').fill("1090");
    await page.getByRole("button", { name: "Dopočítat USD u všech variant" }).click();
    await expect(page.locator('input[id="variants.0.price-usd"]')).toHaveValue("47.99");

    await page.getByRole("button", { name: "Uložit" }).click();
    await expect(page.getByText("Uloženo.")).toBeVisible();

    await page.goto("/en/product/quill-glide-mouse");
    await expect(page.getByRole("heading", { level: 1, name: "Quill Glide Mouse Pro" })).toBeVisible();
    await expect(page.locator("#buy").getByText("1,090 CZK").or(page.locator("#buy").getByText("CZK 1,090"))).toBeVisible();
  });

  test("validation errors are shown and nothing is saved", async ({ page }) => {
    await login(page);
    await page.goto("/admin/products/new");
    await page.getByRole("button", { name: "Uložit" }).click();
    await expect(page.getByText("Formulář obsahuje chyby").first()).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/products\/new/);
  });

  test("editors cannot manage settings or admin users", async ({ page, browser }) => {
    await login(page);
    await page.goto("/admin/users/new");
    await page.getByLabel("Jméno").fill("Eda Editor");
    await page.getByLabel("E-mail").fill("editor@jiskra.local");
    await page.getByLabel("Heslo").fill("editor-password-1");
    await page.getByRole("button", { name: "Uložit" }).click();
    await expect(page.getByText("Uloženo.")).toBeVisible();

    const ctx = await browser.newContext();
    const editor = await ctx.newPage();
    await login(editor, "editor@jiskra.local", "editor-password-1");
    await expect(editor.getByRole("link", { name: "Nastavení" })).toHaveCount(0);
    await editor.goto("/admin/settings");
    await expect(editor).toHaveURL(/\/admin\?forbidden=1/);
    await expect(editor.getByText("K této sekci nemáte oprávnění")).toBeVisible();
    await ctx.close();
  });

  test("order status change is recorded in the history", async ({ page }) => {
    await login(page);
    await page.goto("/admin/orders?status=NEW");
    await page.locator("tbody tr").first().getByRole("link").first().click();
    await page.getByLabel("Nový stav").selectOption("CONFIRMED");
    await page.getByLabel("Poznámka (nepovinná)").fill("Ověřeno telefonicky");
    await page.getByRole("button", { name: "Změnit stav" }).click();
    await expect(page.getByText("Ověřeno telefonicky")).toBeVisible();
  });
});
