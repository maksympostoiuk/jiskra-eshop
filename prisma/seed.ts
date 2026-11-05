/* Seed script: wipes the database and loads the demo catalogue. Run with `npm run db:seed`. */
import { PrismaClient } from "@prisma/client";
import { refreshProductAggregates } from "../src/lib/catalog/aggregates";
import { hashPassword } from "../src/lib/auth/password";
import { convertCzkToUsd } from "../src/lib/money";
import { placeholderUrl } from "../src/lib/placeholder";
import { specTextKey } from "../src/lib/catalog/spec-format";
import { createRng, randomToken } from "../src/lib/random";
import { orderSearchText, reviewSearchText, slugify } from "../src/lib/text";
import {
  BADGES,
  BRANDS,
  CATEGORIES,
  PRODUCTS,
  REVIEW_AUTHORS,
  REVIEW_POOL,
  SPECS,
  describe,
  type CategorySeed,
  type Tr,
} from "./seed/catalog-data";

const prisma = new PrismaClient();
const rng = createRng(20261105);
const USD_RATE = 228000; // 22.80 CZK per USD
const usd = (czkMinor: number) => convertCzkToUsd(czkMinor, USD_RATE, "NINETY_NINE");
const DAY = 24 * 60 * 60 * 1000;

async function wipe() {
  // Order matters because of foreign keys.
  await prisma.orderStatusChange.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.review.deleteMany();
  await prisma.productSpecValue.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.variantOption.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.productTranslation.deleteMany();
  await prisma.product.deleteMany();
  await prisma.specDefinition.deleteMany();
  await prisma.categoryTranslation.deleteMany();
  await prisma.category.updateMany({ data: { parentId: null } });
  await prisma.category.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.badge.deleteMany();
  await prisma.banner.deleteMany();
  await prisma.shippingMethod.deleteMany();
  await prisma.adminSession.deleteMany();
  await prisma.adminUser.deleteMany();
  await prisma.settings.deleteMany();
  await prisma.counter.deleteMany();
}

async function seedCategories() {
  const ids = new Map<string, string>();
  const slugs = new Map<string, Tr>();
  const create = async (c: CategorySeed, parentId: string | null, sortOrder: number) => {
    const created = await prisma.category.create({
      data: {
        parentId,
        icon: c.icon,
        sortOrder,
        translations: {
          create: [
            { locale: "cs", name: c.cs[0], slug: c.cs[1], description: c.descr?.[0] ?? "" },
            { locale: "en", name: c.en[0], slug: c.en[1], description: c.descr?.[1] ?? "" },
          ],
        },
      },
    });
    ids.set(c.key, created.id);
    slugs.set(c.key, [c.cs[1], c.en[1]]);
    for (const [i, child] of (c.children ?? []).entries()) await create(child, created.id, i);
  };
  for (const [i, c] of CATEGORIES.entries()) await create(c, null, i);
  return { ids, slugs };
}

async function seedSpecs(categoryIds: Map<string, string>) {
  const specIds = new Map<string, string>(); // `${cat}:${key}` → id
  for (const [cat, specs] of Object.entries(SPECS)) {
    const categoryId = categoryIds.get(cat);
    if (!categoryId) throw new Error(`Unknown category ${cat}`);
    for (const [i, spec] of specs.entries()) {
      const unit: Tr = Array.isArray(spec.unit) ? spec.unit : [spec.unit ?? "", spec.unit ?? ""];
      const created = await prisma.specDefinition.create({
        data: {
          categoryId,
          key: spec.key,
          type: spec.type,
          isFilterable: spec.filterable ?? false,
          isKey: spec.isKey ?? false,
          sortOrder: i,
          translations: {
            create: [
              { locale: "cs", label: spec.label[0], unit: unit[0] },
              { locale: "en", label: spec.label[1], unit: unit[1] },
            ],
          },
        },
      });
      specIds.set(`${cat}:${spec.key}`, created.id);
    }
  }
  return specIds;
}

async function seedProducts(
  categoryIds: Map<string, string>,
  brandIds: Map<string, string>,
  badgeIds: Map<string, string>,
  specIds: Map<string, string>,
) {
  const productIds: string[] = [];
  const now = Date.now();
  for (const p of PRODUCTS) {
    const brand = BRANDS.find((b) => b.slug === p.brand)!;
    const [descCs, descEn] = describe(p);
    const createdAt = new Date(now - p.age * DAY);
    const product = await prisma.product.create({
      data: {
        categoryId: categoryIds.get(p.cat)!,
        brandId: brandIds.get(p.brand)!,
        status: "PUBLISHED",
        isFeatured: p.featured ?? false,
        soldCount: p.sold,
        createdAt,
        publishedAt: createdAt,
        badges: { connect: (p.badges ?? []).map((code) => ({ id: badgeIds.get(code)! })) },
        translations: {
          create: [
            { locale: "cs", name: p.name, slug: slugify(p.name), shortDescription: p.short[0], description: descCs },
            { locale: "en", name: p.name, slug: slugify(p.name), shortDescription: p.short[1], description: descEn },
          ],
        },
      },
    });
    productIds.push(product.id);

    // Variants: colours × optional second attribute.
    const optionValues = p.option?.values ?? [null];
    let sort = 0;
    const firstVariantOfColor = new Map<string, string>();
    for (const color of p.colors) {
      for (const opt of optionValues) {
        const priceCzk = (p.price + (opt?.[3] ?? 0)) * 100;
        const oldPriceCzk = p.old ? (p.old + (opt?.[3] ?? 0)) * 100 : null;
        const roll = rng.next();
        const stock = roll < 0.12 ? 0 : roll < 0.25 ? rng.int(1, 4) : rng.int(5, 60);
        const sku = [brand.code, p.code, color[0].slice(0, 3).toUpperCase(), opt ? opt[0].toUpperCase() : null]
          .filter(Boolean)
          .join("-");
        const variant = await prisma.productVariant.create({
          data: {
            productId: product.id,
            sku,
            priceCzk,
            priceUsd: usd(priceCzk),
            oldPriceCzk,
            oldPriceUsd: oldPriceCzk ? usd(oldPriceCzk) : null,
            stock,
            sortOrder: sort++,
            options: {
              create: [
                { name: "color", value: color[0], labelCs: color[1], labelEn: color[2], colorHex: `#${color[3]}`, sortOrder: 0 },
                ...(opt && p.option
                  ? [{ name: p.option.name, value: opt[0], labelCs: opt[1], labelEn: opt[2], sortOrder: 1 }]
                  : []),
              ],
            },
          },
        });
        if (!firstVariantOfColor.has(color[0])) firstVariantOfColor.set(color[0], variant.id);
      }
    }

    // Images: three generated views per colour, linked to the first variant of that colour.
    let imageSort = 0;
    for (const color of p.colors) {
      for (const view of [1, 2, 3]) {
        await prisma.productImage.create({
          data: {
            productId: product.id,
            variantId: p.colors.length > 1 ? firstVariantOfColor.get(color[0]) : null,
            url: placeholderUrl(p.kind, color[3], view),
            altCs: `${p.name} – ${color[1].toLowerCase()}, pohled ${view}`,
            altEn: `${p.name} – ${color[2].toLowerCase()}, view ${view}`,
            sortOrder: imageSort++,
          },
        });
      }
    }

    // Spec values.
    for (const [key, value] of Object.entries(p.specs)) {
      const specDefinitionId = specIds.get(`${p.cat}:${key}`);
      if (!specDefinitionId) throw new Error(`Unknown spec ${p.cat}:${key}`);
      const spec = SPECS[p.cat].find((s) => s.key === key)!;
      if (spec.type === "NUMBER" && typeof value === "number" && value === 0) continue; // "not applicable"
      await prisma.productSpecValue.create({
        data: {
          productId: product.id,
          specDefinitionId,
          numberValue: spec.type === "NUMBER" ? Number(value) : null,
          boolValue: spec.type === "BOOLEAN" ? Boolean(value) : null,
          textCs: spec.type === "TEXT" ? (Array.isArray(value) ? value[0] : String(value)) : null,
          textEn: spec.type === "TEXT" ? (Array.isArray(value) ? value[1] : String(value)) : null,
          textKey: spec.type === "TEXT" ? specTextKey(Array.isArray(value) ? value[0] : String(value), null) : null,
        },
      });
    }

    // Reviews.
    const reviewCount = rng.int(0, 6);
    for (let i = 0; i < reviewCount; i++) {
      const r = rng.pick(REVIEW_POOL);
      const locale = rng.chance(0.7) ? "cs" : "en";
      const status = rng.chance(0.85) ? "APPROVED" : "PENDING";
      const authorName = rng.pick(REVIEW_AUTHORS);
      await prisma.review.create({
        data: {
          productId: product.id,
          authorName,
          searchText: reviewSearchText({ authorName, text: locale === "cs" ? r.cs : r.en }),
          rating: r.rating,
          text: locale === "cs" ? r.cs : r.en,
          locale,
          status,
          moderatedAt: status === "APPROVED" ? new Date() : null,
          createdAt: new Date(now - rng.int(1, Math.max(2, p.age)) * DAY),
        },
      });
    }

    await refreshProductAggregates(prisma, product.id);
  }
  return productIds;
}

async function seedBanners(catSlugs: Map<string, Tr>) {
  const cat = (key: string): Tr => {
    const s = catSlugs.get(key)!;
    return [`/category/${s[0]}`, `/category/${s[1]}`];
  };
  const banners: Array<{
    placement: string;
    bg: string;
    fg: string;
    image: string | null;
    title: Tr;
    subtitle: Tr;
    cta: Tr;
    link: Tr;
    alt: Tr;
  }> = [
    { placement: "HERO", bg: "#e1eeeb", fg: "#25212b", image: placeholderUrl("headphones", "d8c3a5", 1), title: ["Podzim plný hudby", "An autumn full of music"], subtitle: ["Sluchátka a reproduktory až o 25 % levněji", "Headphones and speakers up to 25% off"], cta: ["Vybrat sluchátka", "Shop headphones"], link: cat("headphones"), alt: ["Bezdrátová sluchátka v pískové barvě", "Sand-coloured wireless headphones"] },
    { placement: "HERO_SIDE", bg: "#fcefd9", fg: "#25212b", image: placeholderUrl("phone", "b7a6c9", 2), title: ["Nová Aurora 8 Pro", "The new Aurora 8 Pro"], subtitle: ["Fotoaparát 200 Mpx", "200 MP camera"], cta: ["Prohlédnout", "Discover"], link: ["/product/nordvik-aurora-8-pro", "/product/nordvik-aurora-8-pro"], alt: ["Telefon v levandulové barvě", "Lavender phone"] },
    { placement: "HERO_SIDE", bg: "#25212b", fg: "#ffffff", image: placeholderUrl("controller", "a8463d", 1), title: ["Herní týdny", "Gaming weeks"], subtitle: ["Konzole a ovladače v akci", "Consoles and controllers on sale"], cta: ["Do herního světa", "Enter gaming"], link: cat("gaming"), alt: ["Červený herní ovladač", "Red game controller"] },
    { placement: "PROMO", bg: "#f2ede5", fg: "#25212b", image: placeholderUrl("laptop", "c9ccd1", 1), title: ["Notebooky pro studenty", "Laptops for students"], subtitle: ["Lehké, tiché, s celodenní výdrží", "Light, quiet, all-day battery"], cta: ["Vybrat", "Browse"], link: cat("laptops"), alt: ["Stříbrný notebook", "Silver laptop"] },
    { placement: "PROMO", bg: "#e1eeeb", fg: "#25212b", image: placeholderUrl("watch", "5e7d63", 1), title: ["Chytré hodinky", "Smart watches"], subtitle: ["Pohyb pod kontrolou", "Stay on top of your activity"], cta: ["Vybrat", "Browse"], link: cat("smartwatches"), alt: ["Zelené chytré hodinky", "Green smart watch"] },
    { placement: "PROMO", bg: "#fbe6e1", fg: "#25212b", image: placeholderUrl("tv", "4a4e55", 1), title: ["Velké obrazovky", "Big screens"], subtitle: ["OLED a QLED televize", "OLED and QLED TVs"], cta: ["Vybrat", "Browse"], link: cat("tvs"), alt: ["Televize", "Television"] },
    { placement: "PROMO", bg: "#fcefd9", fg: "#25212b", image: placeholderUrl("powerbank", "d8c3a5", 1), title: ["Energie na cesty", "Power on the go"], subtitle: ["Powerbanky a nabíječky", "Power banks and chargers"], cta: ["Vybrat", "Browse"], link: cat("power"), alt: ["Powerbanka", "Power bank"] },
  ];
  for (const [i, b] of banners.entries()) {
    await prisma.banner.create({
      data: {
        placement: b.placement,
        bgColor: b.bg,
        textColor: b.fg,
        imageUrl: b.image,
        sortOrder: i,
        translations: {
          create: [
            { locale: "cs", title: b.title[0], subtitle: b.subtitle[0], ctaLabel: b.cta[0], linkUrl: b.link[0], imageAlt: b.alt[0] },
            { locale: "en", title: b.title[1], subtitle: b.subtitle[1], ctaLabel: b.cta[1], linkUrl: b.link[1], imageAlt: b.alt[1] },
          ],
        },
      },
    });
  }
}

async function seedShipping() {
  const methods = [
    { code: "pickup", czk: 0, freeCzk: null, name: ["Osobní odběr na prodejně", "Store pickup"], desc: ["Praha 2, připraveno do 2 hodin", "Prague 2, ready within 2 hours"] },
    { code: "pickup-point", czk: 79, freeCzk: 2000, name: ["Výdejní místo", "Pickup point"], desc: ["Více než 3 000 míst po celé ČR, 1–2 dny", "3,000+ points across Czechia, 1–2 days"] },
    { code: "courier", czk: 129, freeCzk: 5000, name: ["Kurýr na adresu", "Courier to your door"], desc: ["Doručení následující pracovní den", "Next business day delivery"] },
  ] as const;
  for (const [i, m] of methods.entries()) {
    await prisma.shippingMethod.create({
      data: {
        code: m.code,
        priceCzk: m.czk * 100,
        priceUsd: m.czk === 0 ? 0 : usd(m.czk * 100),
        freeFromCzk: m.freeCzk ? m.freeCzk * 100 : null,
        freeFromUsd: m.freeCzk ? usd(m.freeCzk * 100) : null,
        sortOrder: i,
        translations: {
          create: [
            { locale: "cs", name: m.name[0], description: m.desc[0] },
            { locale: "en", name: m.name[1], description: m.desc[1] },
          ],
        },
      },
    });
  }
}

async function seedOrders() {
  const variants = await prisma.productVariant.findMany({
    include: { product: { include: { translations: true, images: { take: 1, orderBy: { sortOrder: "asc" } } } }, options: true },
  });
  const shipping = await prisma.shippingMethod.findMany({ include: { translations: true } });
  const statuses = ["NEW", "NEW", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "DELIVERED", "CANCELLED", "DELIVERED", "NEW"];
  const people = [
    ["Jana", "Novotná", "Praha"],
    ["Petr", "Svoboda", "Brno"],
    ["Lucie", "Dvořáková", "Ostrava"],
    ["Tomáš", "Černý", "Plzeň"],
    ["Emily", "Clark", "Praha"],
  ];
  for (const [i, status] of statuses.entries()) {
    const currency = i % 4 === 3 ? "USD" : "CZK";
    const locale = currency === "USD" ? "en" : "cs";
    const person = people[i % people.length];
    const lines = Array.from({ length: rng.int(1, 3) }, () => rng.pick(variants));
    const items = lines.map((v) => {
      const unitPrice = currency === "CZK" ? v.priceCzk : v.priceUsd;
      const quantity = rng.int(1, 2);
      return {
        productId: v.productId,
        variantId: v.id,
        productName: v.product.translations.find((t) => t.locale === locale)!.name,
        variantName: v.options.map((o) => (locale === "cs" ? o.labelCs : o.labelEn)).join(", "),
        sku: v.sku,
        imageUrl: v.product.images[0]?.url ?? null,
        currency,
        unitPrice,
        quantity,
        lineTotal: unitPrice * quantity,
      };
    });
    const itemsTotal = items.reduce((sum, it) => sum + it.lineTotal, 0);
    const method = shipping[i % shipping.length];
    const shippingPrice = currency === "CZK" ? method.priceCzk : method.priceUsd;
    const createdAt = new Date(Date.now() - (statuses.length - i) * 2 * DAY - rng.int(0, 600) * 60000);
    const counter = await prisma.counter.upsert({
      where: { key: "order" },
      create: { key: "order", value: 1 },
      update: { value: { increment: 1 } },
    });
    const number = `${createdAt.getFullYear()}${String(counter.value).padStart(5, "0")}`;
    const email = `${slugify(person[0])}.${slugify(person[1])}@example.com`;
    await prisma.order.create({
      data: {
        number,
        searchText: orderSearchText({ number, email, firstName: person[0], lastName: person[1], phone: "+420 777 123 456" }),
        accessToken: randomToken(),
        status,
        locale,
        currency,
        email,
        phone: "+420 777 123 456",
        firstName: person[0],
        lastName: person[1],
        street: "Dlouhá 12",
        city: person[2],
        zip: "110 00",
        country: "CZ",
        shippingMethodId: method.id,
        shippingMethodName: method.translations.find((t) => t.locale === locale)!.name,
        shippingPrice,
        paymentMethod: i % 2 ? "cod" : "bank_transfer",
        paymentStatus: ["SHIPPED", "DELIVERED"].includes(status) ? "PAID" : "PENDING",
        itemsTotal,
        total: itemsTotal + shippingPrice,
        createdAt,
        items: { create: items },
        history: {
          create: [
            { fromStatus: null, toStatus: "NEW", createdAt },
            ...(status !== "NEW" ? [{ fromStatus: "NEW", toStatus: status, createdAt: new Date(createdAt.getTime() + DAY) }] : []),
          ],
        },
      },
    });
  }
}

async function main() {
  console.log("Seeding database…");
  await wipe();

  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@jiskra.local";
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!password || password.length < 8) {
    throw new Error("Set SEED_ADMIN_PASSWORD (min. 8 characters) in .env before seeding.");
  }
  await prisma.adminUser.create({
    data: { email: email.toLowerCase(), name: process.env.SEED_ADMIN_NAME ?? "Admin", role: "ADMIN", passwordHash: await hashPassword(password) },
  });

  await prisma.settings.create({
    data: {
      id: 1,
      usdRate: USD_RATE,
      usdRounding: "NINETY_NINE",
      shopName: "Jiskra",
      contactEmail: "obchod@jiskra.local",
      contactPhone: "+420 123 456 789",
      address: "Ukázková 1, 110 00 Praha 1",
      companyId: "12345678",
      bankAccount: "0000000000/0000",
      iban: "CZ00 0000 0000 0000 0000 0000",
      lowStockThreshold: 5,
    },
  });

  const brandIds = new Map<string, string>();
  for (const [i, b] of BRANDS.entries()) {
    const created = await prisma.brand.create({ data: { name: b.name, slug: b.slug, sortOrder: i } });
    brandIds.set(b.slug, created.id);
  }

  const badgeIds = new Map<string, string>();
  for (const b of BADGES) {
    const created = await prisma.badge.create({
      data: {
        code: b.code,
        bgColor: b.bg,
        textColor: b.fg,
        sortOrder: b.sort,
        translations: { create: [{ locale: "cs", label: b.label[0] }, { locale: "en", label: b.label[1] }] },
      },
    });
    badgeIds.set(b.code, created.id);
  }

  const { ids: categoryIds, slugs: catSlugs } = await seedCategories();
  const specIds = await seedSpecs(categoryIds);
  const productIds = await seedProducts(categoryIds, brandIds, badgeIds, specIds);
  await seedBanners(catSlugs);
  await seedShipping();
  await seedOrders();

  console.log(
    `Done: ${categoryIds.size} categories, ${brandIds.size} brands, ${productIds.length} products, admin ${email}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
