# Jiskra — electronics e-shop with a built-in CMS

Self-written online store for consumer electronics with its own admin panel. No third-party CMS or
e-commerce engine. Czech (default) + English, CZK (default) + USD.

**Stack:** Next.js 15 (App Router) · TypeScript (strict) · Tailwind CSS 4 · Prisma 6 (SQLite in dev,
PostgreSQL-ready) · next-intl · Zod · Vitest · Playwright.

## Quick start

Requirements: Node.js 20+ and npm.

```bash
npm install
cp .env.example .env        # adjust SEED_ADMIN_* if you like
npm run db:push             # create the SQLite database (prisma/dev.db)
npm run db:seed             # demo catalogue + admin user
npm run dev                 # http://localhost:3000 → redirects to /cs
```

The admin panel lives at `/admin` (credentials = `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from `.env`).

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit + integration tests (uses a throwaway `prisma/test.db`) |
| `npm run test:e2e` | Playwright end-to-end tests (starts the app itself) |
| `npm run db:reset` | Drop, recreate and reseed the dev database |

## Project layout

```
messages/<locale>/*.json   UI strings per namespace (cs, en)
prisma/                    schema + seed
src/app/[locale]/          storefront (localized)
src/app/admin/             CMS (not localized; UI language from cookie)
src/components/            UI, storefront and admin components
src/lib/                   domain logic (money, cart, filters, orders, payments, mailer, storage, auth)
src/i18n/                  next-intl routing and request config
```

See `PROGRESS.md` for the phase plan, decisions and current status.

## Production notes

- Switch `provider = "sqlite"` to `"postgresql"` in `prisma/schema.prisma` and set `DATABASE_URL`.
  The schema avoids SQLite-only features.
- Stripe is enabled only when `STRIPE_SECRET_KEY` is set (use test keys).
- Uploads use the `Storage` interface; the dev implementation writes to `public/uploads`.
