import { unstable_cache } from "next/cache";
import { getRedis } from "@/lib/redis";
import { SEED_PRODUCTS, SOAP_PRICE, type Product } from "@/lib/products";

// The shop's soaps live in one Redis hash, keyed by slug. The original 13 are
// copied in once from products.ts; after that this is the only source.
const PRODUCTS_KEY = "catalog:products";
const SEEDED_KEY = "catalog:seeded";

// Saving a soap in the admin expires this tag so the shop updates right away.
export const CATALOG_TAG = "catalog";

export type CatalogProduct = Product & {
  // Hidden soaps are not listed or sold, but stay in the catalog so old orders
  // and carts can still find their name.
  hidden: boolean;
  // Position in the shop grid; new soaps go last.
  sortOrder: number;
};

function seedRecords(): CatalogProduct[] {
  return SEED_PRODUCTS.map((product, index) => ({
    ...product,
    hidden: false,
    sortOrder: index,
  }));
}

// Turns whatever Redis returned into a soap, or null if it isn't one. Redis
// may hand back an already-parsed object or a JSON string.
export function parseCatalogProduct(raw: unknown): CatalogProduct | null {
  let value: unknown = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const text = (field: unknown) => (typeof field === "string" ? field : null);

  const slug = text(record.slug);
  const name = text(record.name);
  const tagline = text(record.tagline);
  const description = text(record.description);
  const gradient = text(record.gradient);
  if (!slug || !name || tagline === null || description === null || !gradient) {
    return null;
  }
  if (
    !Array.isArray(record.ingredients) ||
    !record.ingredients.every((item) => typeof item === "string")
  ) {
    return null;
  }

  return {
    slug,
    name,
    tagline,
    description,
    gradient,
    ingredients: record.ingredients as string[],
    image: text(record.image) || undefined,
    // One price for every soap, so the bundle deals stay correct.
    price: SOAP_PRICE,
    hidden: record.hidden === true,
    sortOrder:
      typeof record.sortOrder === "number" && Number.isFinite(record.sortOrder)
        ? record.sortOrder
        : Number.MAX_SAFE_INTEGER,
  };
}

// Copies the original 13 soaps into an empty catalog, once. Safe to run twice
// or from two requests at the same moment: each soap is written only if it
// isn't there yet, so it can never overwrite something the owner edited.
async function ensureSeeded(): Promise<void> {
  const redis = getRedis();
  if (await redis.get(SEEDED_KEY)) return;

  for (const record of seedRecords()) {
    await redis.hsetnx(PRODUCTS_KEY, record.slug, JSON.stringify(record));
  }
  await redis.set(SEEDED_KEY, "1");
}

// Every soap, hidden ones included, in shop order. Throws if Redis can't be
// read: callers decide what that means for them.
async function readCatalog(): Promise<CatalogProduct[]> {
  await ensureSeeded();

  const stored = await getRedis().hgetall<Record<string, unknown>>(PRODUCTS_KEY);
  const catalog = Object.values(stored ?? {})
    .map(parseCatalogProduct)
    .filter((product): product is CatalogProduct => product !== null);

  return catalog.sort(
    (a, b) => a.sortOrder - b.sortOrder || a.slug.localeCompare(b.slug),
  );
}

// For anything that decides about money or orders (payment, availability, the
// order webhook, admin): always the current catalog.
export const getCatalogFresh = readCatalog;

// For the storefront pages. These are prebuilt, so the catalog is read through
// Next's data cache: saving in the admin expires CATALOG_TAG, and the 60 s
// revalidate is a safety net in case that is ever missed.
const getCachedCatalog = unstable_cache(readCatalog, ["catalog"], {
  tags: [CATALOG_TAG],
  revalidate: 60,
});

export async function getCatalog(): Promise<CatalogProduct[]> {
  try {
    return await getCachedCatalog();
  } catch (err) {
    // Only while the site is being built (e.g. a branch preview that has no
    // database connection): build with the original 13 so the build doesn't
    // fail. The pages refresh from the real catalog within a minute once they
    // are live. A failure while the site is running is NOT hidden.
    if (process.env.NEXT_PHASE === "phase-production-build") {
      console.warn("[catalog] No catalog available at build time; using the original soaps:", err);
      return seedRecords();
    }
    throw err;
  }
}

export function visibleProducts(catalog: CatalogProduct[]): CatalogProduct[] {
  return catalog.filter((product) => !product.hidden);
}

export function findProduct(
  catalog: CatalogProduct[],
  slug: string,
): CatalogProduct | undefined {
  return catalog.find((product) => product.slug === slug);
}
