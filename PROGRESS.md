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
| 3 | Storefront | ⏳ next |
| 4 | Cart and checkout | ☐ |
| 5 | Quality: tests, e2e, final pass | ☐ |

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

## CMS (Phase 2)

`/admin` (not localized; CS/EN switch in the top bar stores `ADMIN_LOCALE`). Login at `/admin/login`.

- **Auth:** own implementation — bcrypt (cost 12) password hashes, random 32-byte session token in an httpOnly
  `admin_session` cookie, only its SHA-256 stored in `AdminSession` (7-day expiry). Middleware does a cheap cookie
  presence check; `requireAdmin()` validates against the DB in the panel layout and in **every** server action.
  Login is rate-limited in memory (5 attempts / 15 min per IP+e-mail) — single-node only.
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

## Known issues

- `npm audit` reports advisories in dev-only tooling (vitest's tinypool) and in the postcss copy bundled
  inside Next 15.5; no runtime exposure for this app. Revisit when upgrading majors.
