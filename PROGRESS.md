# PROGRESS

Living status document: what is done, what is next, decisions and known issues.

## Brand

- **Name:** Jiskra (Czech for "spark"). Wordmark = lowercase serif "jiskra" + amber four-point spark
  (`src/components/brand/logo.tsx`, favicon `src/app/icon.svg`).
- **Palette** (tokens in `src/app/globals.css`, Tailwind v4 `@theme`): warm off-white canvas `#faf7f2`,
  near-black ink `#25212b`, deep teal brand `#1d5c55`, amber spark `#e3992c`, terracotta sale `#b23a2b`.
- **Type:** Fraunces (serif display, headings) + Inter (body), self-hosted via `@fontsource-variable/*`.
- **Shape:** cards `rounded-xl` (20px), pill buttons, soft shadows, airy spacing.

## Phase plan

| Phase | Scope | Status |
| --- | --- | --- |
| 0 | Setup: Next.js, TS, Tailwind, Prisma, next-intl, Zod, Vitest, tokens, brand | ✅ done |
| 1 | Prisma data model + seed | ✅ done |
| 2 | CMS / admin panel (`/admin`) | ✅ done |
| 3 | Storefront | ✅ done |
| 4 | Cart and checkout | ✅ done |
| 5 | Quality: tests, e2e, final pass | ✅ done |
| 6 | Second pass: review fixes, known issues, accounts, transports | ✅ done |

## Decisions

- **Versions pinned to well-known majors:** Next 15.5 (App Router), React 19.1, Prisma 6.19, Tailwind 4,
  Zod 4, Vitest 3, TypeScript 5.9, ESLint 9 (flat config + `eslint-config-next`).
- **i18n:** `next-intl` with `localePrefix: "always"` (`/cs/...`, `/en/...`), Czech default, locale remembered in the
  `NEXT_LOCALE` cookie by the middleware. Messages are split per namespace in `messages/<locale>/<ns>.json`;
  a Vitest test checks that cs/en key sets match. The non-localized `/admin` reads its UI language from the
  `ADMIN_LOCALE` cookie (falls back to `NEXT_LOCALE`).
- **Root layout** only passes children; `<html>` is rendered by `[locale]/layout.tsx` and `admin/layout.tsx`.
- **Money:** integer minor units everywhere (`src/lib/money.ts`). Exchange rate stored as an integer
  "CZK per 1 USD × 10 000" so CZK→USD conversion is exact (BigInt math). USD rounding modes: cent / whole / .99.
- **Validation messages:** Zod 4 built-in locales (`cs`, `en`) are passed per parse, custom messages are i18n keys.

## Data model (Phase 1)

`prisma/schema.prisma` — Category (tree) + CategoryTranslation, Brand, Product + ProductTranslation,
ProductVariant + VariantOption (color/storage/memory/size/connectivity/edition, labels cs/en, swatch hex),
ProductImage (ordered, optionally tied to a variant/colour), SpecDefinition (+translation: label, unit) per category
and ProductSpecValue (number / bool / text cs+en), Badge (+translation, colours), Banner (+translation incl. link),
Customer, Order + OrderItem (snapshots) + OrderStatusChange, Review (moderated), AdminUser + AdminSession,
Settings (singleton: USD rate, rounding, contacts, bank details, low-stock threshold), ShippingMethod (+translation,
prices in both currencies, free-from thresholds), Counter (order numbers).

- Enum-like fields are strings validated in code (`src/lib/domain.ts`) — keeps the schema portable.
- Product has denormalized `minPriceCzk/Usd`, `inStock`, `ratingAvg/Count`, `soldCount` and
  `ProductTranslation.searchText` (lowercase, no diacritics) — refreshed by `refreshProductAggregates()`.
- Spec definitions apply to the category they belong to **and its descendants**.
- Placeholder product images are generated SVG device illustrations served from `/ph/<kind>/<hex>/<view>.svg`
  (`src/lib/placeholder.ts`), so the repo contains no third-party imagery.
- Seed (`prisma/seed.ts`, data in `prisma/seed/catalog-data.ts`): 8 top-level + 16 sub-categories, 10 fictional
  brands, 43 products / 123 variants, specs, 4 badges, 7 banners, ~120 reviews (some pending), 3 shipping methods,
  10 sample orders, admin user from `SEED_ADMIN_*`. The seed wipes existing data first.
- Tests use a throwaway `prisma/test.db` recreated by `tests/global-setup.ts`.
- Second pass added `Customer.emailVerifiedAt`, `CustomerSession`, `CustomerToken` (hashed one-time tokens),
  `RateLimitBucket`, `Order.searchText`, `Review.searchText` and `ProductSpecValue.textKey`.

## CMS (Phase 2)

`/admin` (not localized; CS/EN switch in the top bar stores `ADMIN_LOCALE`). Login at `/admin/login`.

- **Auth:** own implementation — bcrypt (cost 12) password hashes, random 32-byte session token in an httpOnly
  `admin_session` cookie, only its SHA-256 stored in `AdminSession` (7-day expiry). Middleware does a cheap cookie
  presence check; `requireAdmin()` validates against the DB in the panel layout and in **every** server action.
  Login is rate-limited in the database (5 attempts / 15 min per IP+e-mail, 20 per e-mail) — see Second pass.
- **Roles:** ADMIN = everything; EDITOR cannot open/act on Admin users and Settings (`requireAdmin({ role: "ADMIN" })`).
- **Sections:** dashboard (orders by status, revenue per currency all-time + 30 days, low stock, latest orders,
  pending reviews), products, categories (tree, up/down reordering, cycle protection, delete blocked when non-empty),
  brands, spec definitions, banners (placement + schedule), badges, reviews (approve/reject/delete → refreshes
  product rating), orders (filters, detail, status transitions with history + e-mail, cancel restocks, payment
  status), admin users, settings (USD rate + rounding, bulk "recalculate all USD prices", contacts, bank details,
  shipping methods in both currencies).
- **Product editor:** CS/EN tabs (name, auto-slug, short/long description, SEO), variant editor (choose attributes:
  colour with swatch, storage, memory, …; SKU, price + old price in CZK/USD with per-field and bulk "fill USD from
  CZK", stock), spec values driven by the category's (and ancestors') SpecDefinitions, image upload via `Storage`
  with drag-and-drop (files and reordering) + keyboard arrow buttons, alt texts per language, colour-linked images,
  badges, publish/draft, featured.
- **Validation:** the same Zod schemas (`src/lib/validation/admin.ts`) run on the client before submit and on the
  server; messages localized (Zod locales + `validation` namespace). Cross-record checks (unique slug per locale,
  unique SKU, unique spec key) on the server. Deletes go through a confirmation `<dialog>`.
- **Messages check:** `src/i18n/keys.test.ts` statically verifies that literal translation keys used in code exist.

## Storefront (Phase 3)

Routes (all under `/cs` and `/en`): `/` home, `/category/[slug]`, `/product/[slug]`, `/search?q=`, `/favorites`,
`/compare` (+ `/cart`, `/checkout`, `/order/[number]` in Phase 4). `sitemap.xml`, `robots.txt` at the root.

- **Header** (`src/components/store/site-header.tsx`): utility bar (free-shipping note, phone, CS/EN + CZK/USD
  switchers), logo, big "Catalog" button → DNS-style mega-menu (icons left, subcategories with counts right;
  accordion drawer on mobile), wide search with combobox suggestions (`/api/search`, categories + products,
  keyboard navigation), compare / favourites / cart icons with live counters. Sticky on ≥ md only.
- **Language vs currency:** language = URL prefix + `NEXT_LOCALE` cookie; currency = `CURRENCY` cookie set by a server
  action. Switching language keeps the path; product/category slugs from the other locale redirect to the right
  slug, keeping the query. Spec facet params (`f_*`) use locale-independent keys and survive the switch.
- **Home:** editorial hero (HERO + 2× HERO_SIDE banners, scheduled via CMS), round category tiles, bestsellers with
  category chips, promo tiles (PROMO banners), new arrivals, brand strip, benefits.
- **Category:** breadcrumbs (+ BreadcrumbList JSON-LD), subcategory chips, filter sidebar / mobile drawer (availability,
  price inputs + presets, brand, rating, filterable specs from the category's SpecDefinitions with counts), sorting,
  grid/list toggle (list shows key specs), pagination. All filter state lives in the URL (`src/lib/catalog/filters.ts`).
  Facet counts are disjunctive (each group counted with the other active filters; options never disappear).
- **Product:** gallery with thumbnails (images follow the selected colour), variant selectors (swatches + buttons,
  sold-out / other-combination states) updating price, old price/discount, stock and SKU; quantity + add to cart,
  favourite, compare; sticky sub-nav (Description / Specs / Reviews / Similar) with scroll-spy and mini buy button;
  specs table; approved reviews with distribution + review form (pending moderation, honeypot, rate-limited);
  related products; Product + AggregateOffer + AggregateRating JSON-LD; hreflang alternates.
- **Favourites & compare:** ids in localStorage (`src/components/store/client-store.ts`); compare page groups by
  category with a shared spec table and "differences only".
- **Images:** `next/image`; generated SVG placeholders are served unoptimized, uploads are optimized.

## Cart and checkout (Phase 4)

- **Cart** (`/cart`): lines `{variantId, qty}` in localStorage; prices, names, images and stock are re-quoted on the
  server (`quoteCart`) in the visitor's currency. Quantity steppers capped by stock, stock/unavailable warnings with
  "set to available" fix, free-shipping progress bar, totals via the pure `computeTotals` (`src/lib/cart.ts`).
- **Checkout** (`/checkout`): guest checkout — contact, address (CZ/SK/DE/AT/PL), shipping method from Settings with
  prices and free-from thresholds in the active currency, payment method from the `PaymentProvider` registry
  (COD disabled when the shipping method doesn't allow it), note, consent. Same Zod schema client + server
  (`checkoutSchema`). Contact details are remembered in localStorage as a convenience.
- **Order creation** (`src/lib/orders/create-order.ts`): one transaction — server-side re-pricing (`planOrder`),
  stock check, conditional decrement (`updateMany … stock >= qty`, so concurrent orders cannot oversell), snapshot
  of product name, variant label, SKU, image, unit price and currency, customer upsert, order number from `Counter`,
  status history, `soldCount` + aggregates. Then the payment provider is initiated and the confirmation e-mail is
  sent through the `Mailer` (console in dev, includes bank-transfer instructions).
- **Payments** (`src/lib/payments`): `bank_transfer` (variable symbol = order number) and `cod` work without keys;
  `stripe` (hosted Checkout via REST, no SDK) only when `STRIPE_SECRET_KEY` is set. Return URL confirms the session
  server-side; `/api/stripe/webhook` verifies `STRIPE_WEBHOOK_SECRET` signatures and marks orders paid.
- **Confirmation** (`/order/[number]?token=…`): requires the per-order secret token (no enumeration), shows status,
  payment instructions, items and address.
- **Status e-mails:** changing an order's status in the CMS e-mails the customer (`sendOrderStatusEmail`).

## Quality (Phase 5)

Test suites as of the second pass (see below for what was added):

- **Vitest (135 tests):** money, conversion and rounding; cart lines/totals/stock; filters, presets and
  text keys; variant selection; spec formatting; category tree and visibility; product form round-trip;
  checkout/review/account validation with localized messages; link/image-path validation; upload sniffing; locale
  number formatting; payment providers, Stripe (mocked API) and webhook signatures; mail transports; S3 storage
  (mocked client); message catalogue parity and a static check of every translation key used in code.
  **Integration tests on `prisma/test.db`:** order creation (stock, snapshots, price-change guard, inactive
  categories, account linking), product persistence (SKU swap, foreign variant ids, images, specs), listing filters
  and disjunctive facets, the DB rate limiter, customer accounts (verification, single-use tokens, takeover
  attempts, reset) and orphaned-upload cleanup.
- **Playwright (22 tests, `tests/e2e`):** purchase flow, language vs currency, filters surviving a language
  switch, currency switch dropping price bounds, search suggestions, mobile drawers, the full account flow
  (register → verify via the file mail outbox → sign in → pre-filled checkout → order history → password reset),
  CMS login/edit/validation/roles/order history, security headers, and **axe WCAG 2.1 AA scans** of 9 pages.
- `tsc`, ESLint and `next build` are clean.

## Second pass (review) — what changed

Fixed, most severe first:

1. **Image URLs** entered in the CMS are restricted to site-relative paths (an external URL crashed storefront
   pages through `next/image`); protocol-relative links (`//host`) are rejected.
2. **Uploads** are validated by magic bytes, not the browser MIME type; one file per request (no body-limit failures).
3. **Price-change guard:** an order is refused if the server-side total differs from the total the customer saw.
4. **Currency switch** re-quotes cart, checkout, favourites and compare (they kept old-currency prices) and drops
   `pmin/pmax` from listing URLs (bounds were reinterpreted in the new currency).
5. **Product save:** two-phase SKU update (swapping SKUs crashed), brand/badge ids validated, unique-violation races
   reported; the transaction moved to `src/lib/catalog/save-product.ts`.
6. **Stripe:** amount, currency and order id must match before an order is marked paid (return page + webhook).
7. **Login CSRF:** e-mail verification and password reset no longer sign the visitor in.
8. **Security headers:** `frame-ancestors 'none'`/`X-Frame-Options` (CMS clickjacking), nosniff, referrer and
   permissions policies; the order page (token in URL) sends no referrer.
9. **Visibility:** products in deactivated categories (or under a deactivated parent) are hidden everywhere and
   cannot be ordered; the category tree no longer promotes grandchildren of inactive categories.
10. Smaller: product without variants (crash), stale sub-nav variant after navigation, hard-coded `courier`
    shipping code, concurrent status change (500), cross-locale category redirect dropping filters, guest checkout
    overwriting a registered customer's profile, admin logged out when changing their own password, malformed
    input to public actions, e-mails delaying checkout (now sent with `after()`).
11. Consistency: locale number formatting for ratings and discounts, untranslated labels, modal behaviour of the
    mobile filter drawer and CMS navigation (Escape, focus trap/restore, scroll lock), dead code and unused
    messages removed, orphaned uploads deleted after saves/deletes.

Known issues resolved: database-backed rate limits, portable case-insensitive admin search (`searchText` on orders
and reviews, brand slug), locale-independent spec filters (`textKey`), disjunctive facets.

Not-done items implemented: **customer accounts** (register with e-mail verification, sign-in, reset, profile,
order history, pre-filled checkout), **SMTP / file mailers** and **S3-compatible storage**.

Upgrading an existing database: `npm run db:push` then `npm run db:backfill` (fills `searchText`, `textKey` and
aggregates without deleting data), or simply re-seed.

## How to run locally

```bash
npm install
cp .env.example .env
npm run db:push && npm run db:seed
npm run dev            # http://localhost:3000/cs  ·  CMS: http://localhost:3000/admin
npm run check          # typecheck, lint, unit tests, production build
npm run test:e2e       # after `npm run build`
```

Admin login: `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from `.env` (defaults `admin@jiskra.local` /
`change-me-please`). E-mails (order confirmations, account verification/reset links) are printed in the dev-server
console; set `MAILER=file` to collect them in `tmp/mail-outbox.jsonl` or `MAILER=smtp` + `SMTP_URL` to send them.

## What to check manually in the browser

1. Home `/cs`: hero + side banners, category circles, bestseller chips switch the grid, promo tiles, brand strip.
2. Header: "Katalog" mega-menu (hover categories; Esc closes), search suggestions with ↑/↓/Enter, CS/EN and
   CZK/USD switchers are independent and remembered after reload.
3. Category `/cs/category/chytre-telefony`: tick filters (brand, RAM, OS, 5G, price presets), sort, list/grid —
   the URL updates and counts change per group; switch language → same filters. Try the drawer on a phone.
4. Product `/cs/product/nordvik-aurora-8-pro`: colour swatches swap the gallery, storage buttons show sold-out /
   other-combination states, price + SKU + stock update; sticky sub-nav highlights sections; submit a review
   (then approve it in CMS → Recenze and see the rating update).
5. Favourites / compare icons on cards → `/cs/favorites`, `/cs/compare` ("differences only").
6. Cart → checkout → place an order with bank transfer and with cash on delivery; check the console e-mail and the
   confirmation page; verify stock decreased in CMS → Produkty.
7. Accounts: `/cs/account/register` → open the verification link from the console → sign in → checkout is
   pre-filled → the order appears in "Můj účet"; try "Zapomněli jste heslo?".
8. CMS: edit a product (tabs per language, add a variant, "fill USD", upload an image by drag & drop and reorder),
   reorder categories, deactivate a category (its products disappear from the shop), schedule a banner, change an
   order status (customer gets an e-mail; cancelling restocks), create an EDITOR and confirm they can't open
   Settings/Admin users, change the USD rate + "recalculate".
9. `/sitemap.xml`, `/robots.txt`, view-source of a product page (hreflang alternates, Product/BreadcrumbList JSON-LD).
10. Optional Stripe: set `STRIPE_SECRET_KEY` (test key) → "Platební karta (Stripe)" appears at checkout; for webhooks
    also set `STRIPE_WEBHOOK_SECRET` and forward events to `/api/stripe/webhook`.

## Ideas / not implemented (outside the spec)

Deliberately left out because the spec does not ask for them (no features outside the spec without a
reason): DNS-style bundles, warranty add-ons, instalment prices, user photo strip, news/blog cards, a customer list
in the CMS.

## Known issues / still open

- **Stripe** is covered by mocked-API tests but has not been run against real Stripe test keys here.
- **Dependency advisories:** remaining `npm audit` findings need major upgrades — Next 16 (postcss copy bundled in
  Next 15.5), Prisma 7 (`deepmerge-ts` in `@prisma/config`), Vitest 5 (tinypool, dev only), typescript-eslint via
  `eslint-config-next`. Plan these as a separate upgrade; Prisma 7 also needs `prisma.config.ts` (the
  `package.json#prisma` key is deprecated) and driver adapters.
- Uploads that are added in the editor but never saved remain in storage (only previously saved files are cleaned).
- `npm run db:reset` resets the dev database. Tests use
  their own throwaway DB files (`prisma/test.db`, `prisma/e2e.db`).
- Rate-limit buckets are cleaned opportunistically; very high traffic deployments may prefer Redis behind the same
  function signature.
