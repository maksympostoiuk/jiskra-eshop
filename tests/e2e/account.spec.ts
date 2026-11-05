import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

/** Latest e-mail to `to` from the e2e file outbox, and the first link in it. */
async function lastLink(to: string): Promise<string> {
  let link: string | undefined;
  await expect
    .poll(() => {
      try {
        const mails = readFileSync("tmp/e2e-outbox.jsonl", "utf8").trim().split("\n").map((l) => JSON.parse(l));
        link = mails.filter((m) => m.to === to).at(-1)?.text.match(/https?:\/\/\S+/)?.[0];
      } catch {
        link = undefined;
      }
      return link;
    })
    .toBeTruthy();
  return link!.replace(/^https?:\/\/[^/]+/, "");
}

test("register, verify e-mail, see orders, reset password", async ({ page }) => {
  const email = `petr.${Date.now()}@example.com`;
  await page.goto("/cs/account/register");
  await page.getByLabel("Jméno").fill("Petr");
  await page.getByLabel("Příjmení").fill("Účtový");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Heslo").fill("short");
  await page.getByRole("button", { name: "Vytvořit účet" }).click();
  await expect(page.getByText("Heslo musí mít alespoň 10 znaků.")).toBeVisible();
  await page.getByLabel("Heslo").fill("dlouhe-heslo-123");
  await page.getByRole("button", { name: "Vytvořit účet" }).click();
  await expect(page.getByText(`Na ${email} jsme poslali odkaz`)).toBeVisible();

  // Unverified accounts cannot sign in
  await page.goto("/cs/account/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Heslo").fill("dlouhe-heslo-123");
  await page.getByRole("button", { name: "Přihlásit se" }).click();
  await expect(page.getByText("Nejdřív prosím potvrďte e-mail")).toBeVisible();

  // The link verifies the address but does not sign anyone in (login-CSRF protection)
  await page.goto(await lastLink(email));
  await expect(page).toHaveURL(/\/cs\/account\/login\?verify=ok/);
  await expect(page.getByText("E-mail je ověřený.")).toBeVisible();
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Heslo").fill("dlouhe-heslo-123");
  await page.getByRole("button", { name: "Přihlásit se" }).click();
  await expect(page.getByRole("heading", { name: "Dobrý den, Petr" })).toBeVisible();
  await expect(page.getByText("Zatím jste u nás nenakupovali.")).toBeVisible();

  // Checkout is pre-filled and the order shows up in the account
  await page.goto("/cs/product/kestrel-pods-lite");
  await page.getByRole("button", { name: "Přidat do košíku" }).click();
  await page.goto("/cs/checkout");
  await expect(page.locator("#email")).toHaveValue(email);
  await expect(page.locator("#firstName")).toHaveValue("Petr");
  await page.locator("#phone").fill("+420 777 555 444");
  await page.locator("#street").fill("Nová 1");
  await page.locator("#city").fill("Brno");
  await page.locator("#zip").fill("602 00");
  await page.getByLabel(/Souhlasím s obchodními podmínkami/).check();
  await page.getByRole("button", { name: "Odeslat objednávku" }).click();
  await expect(page.getByRole("heading", { name: "Děkujeme za objednávku!" })).toBeVisible();
  await page.goto("/cs/account");
  await expect(page.getByText(/#\d{9}/)).toBeVisible();

  // Sign out, reset the password, and sign in with the new one
  await page.getByRole("button", { name: "Odhlásit se" }).click();
  await page.goto("/cs/account/forgot");
  await page.getByLabel("E-mail").fill(email);
  await page.getByRole("button", { name: "Poslat odkaz" }).click();
  await expect(page.getByText("Pokud k adrese existuje účet")).toBeVisible();
  await page.goto(await lastLink(email));
  await page.getByLabel("Nové heslo").fill("uplne-nove-heslo-9");
  await page.getByRole("button", { name: "Uložit heslo" }).click();
  await expect(page.getByText("Heslo je změněné.")).toBeVisible();
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Heslo").fill("dlouhe-heslo-123");
  await page.getByRole("button", { name: "Přihlásit se" }).click();
  await expect(page.getByText("Nesprávný e-mail nebo heslo.")).toBeVisible();
  await page.getByLabel("Heslo").fill("uplne-nove-heslo-9");
  await page.getByRole("button", { name: "Přihlásit se" }).click();
  await expect(page.getByRole("heading", { name: "Dobrý den, Petr" })).toBeVisible();
});

test("security headers are sent and the CMS cannot be framed", async ({ request }) => {
  for (const path of ["/cs", "/admin/login"]) {
    const res = await request.get(path);
    expect(res.headers()["x-frame-options"]).toBe("DENY");
    expect(res.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(res.headers()["x-content-type-options"]).toBe("nosniff");
  }
});
