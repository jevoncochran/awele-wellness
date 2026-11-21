const { createHarness, createReporter } = require("./harness.cjs");

const h = createHarness();
const t = createReporter("catalog: import, reading, ordering, parsing");

(async () => {
  const catalog = h.load("lib/catalog");
  const seed = h.load("lib/products");
  const SEED = seed.SEED_PRODUCTS || seed.products;
  const { hashes, kv } = h.redis;
  let hsetnxWrites = 0;

  t.check("storefront read is cached under the 'catalog' tag with a 60s safety net", h.next.cacheCalls.some((c) => c.opts.tags.includes("catalog") && c.opts.revalidate === 60) && catalog.CATALOG_TAG === "catalog");

  t.section("first-time import");
  const realSetnx = h.redis.hashes; // (writes are counted by watching the hash size)
  let list = await catalog.getCatalogFresh();
  hsetnxWrites = Object.keys(hashes["catalog:products"]).length;
  t.check("empty database: the original 13 soaps are imported", list.length === 13 && hsetnxWrites === 13);
  t.check("...in the original shop order", list.map((p) => p.slug).join() === SEED.map((p) => p.slug).join());
  t.check("...all visible, with the shared price", list.every((p) => !p.hidden && p.price === seed.SOAP_PRICE));
  t.check("...and the seeded-once marker is set", kv["catalog:seeded"] === "1");
  t.check("...names, photos, ingredients and gradients carried over intact", JSON.stringify(list.map((p) => [p.name, p.image, p.ingredients, p.gradient])) === JSON.stringify(SEED.map((p) => [p.name, p.image, p.ingredients, p.gradient])));

  const edited = JSON.parse(hashes["catalog:products"]["peppermint"]);
  edited.name = "Peppermint Fresh";
  edited.hidden = true;
  hashes["catalog:products"]["peppermint"] = JSON.stringify(edited);
  delete kv["catalog:seeded"];
  list = await catalog.getCatalogFresh();
  const pep = list.find((p) => p.slug === "peppermint");
  t.check("marker lost and the import re-runs: the owner's edit and hide are kept", pep.name === "Peppermint Fresh" && pep.hidden === true && list.length === 13);

  t.section("reading");
  t.check("fresh read includes hidden soaps (old orders and carts still need them)", list.some((p) => p.hidden));
  t.check("visibleProducts() drops hidden ones", catalog.visibleProducts(list).length === 12 && !catalog.visibleProducts(list).some((p) => p.slug === "peppermint"));
  t.check("findProduct() finds by slug, including hidden", catalog.findProduct(list, "peppermint")?.name === "Peppermint Fresh" && catalog.findProduct(list, "nope") === undefined);

  hashes["catalog:products"]["new-soap"] = JSON.stringify({ slug: "new-soap", name: "New Soap", tagline: "Fresh", description: "d", ingredients: ["Oats"], gradient: seed.GRADIENT_PALETTE[0], sortOrder: 13, image: "https://x.public.blob.vercel-storage.com/a.jpg" });
  list = await catalog.getCatalogFresh();
  t.check("a soap added after the 13 appears last", list.length === 14 && list[13].slug === "new-soap");
  hashes["catalog:products"]["aaa-same-order"] = JSON.stringify({ slug: "aaa-same-order", name: "A", tagline: "", description: "", ingredients: [], gradient: seed.GRADIENT_PALETTE[1], sortOrder: 13 });
  list = await catalog.getCatalogFresh();
  t.check("equal sort positions fall back to slug order (stable)", list[13].slug === "aaa-same-order" && list[14].slug === "new-soap");
  const priced = JSON.parse(hashes["catalog:products"]["new-soap"]);
  priced.price = 1.23;
  hashes["catalog:products"]["new-soap"] = JSON.stringify(priced);
  t.check("a stray stored price is ignored (one shared price always wins)", (await catalog.getCatalogFresh()).find((p) => p.slug === "new-soap").price === seed.SOAP_PRICE);

  t.section("parsing");
  const p = catalog.parseCatalogProduct;
  const base = { slug: "a", name: "A", tagline: "", description: "", ingredients: [], gradient: "g" };
  t.check("JSON string and parsed object both work", p(JSON.stringify(base))?.slug === "a" && p(base)?.slug === "a");
  t.check("garbage, missing fields and wrong types are rejected", p("{oops") === null && p(null) === null && p(5) === null && p({ slug: "a" }) === null && p({ ...base, ingredients: "x" }) === null && p({ ...base, ingredients: [1] }) === null);
  t.check("hidden only when exactly true; missing sortOrder sorts last", p({ ...base, hidden: "true" }).hidden === false && p(base).sortOrder === Number.MAX_SAFE_INTEGER);
  hashes["catalog:products"]["broken"] = "{not json";
  hashes["catalog:products"]["half"] = JSON.stringify({ slug: "half" });
  list = await catalog.getCatalogFresh();
  t.check("a corrupt record in Redis is skipped, not fatal", list.length === 15 && !list.some((x) => x.slug === "broken" || x.slug === "half"));

  t.section("hide and show");
  h.resetRedis();
  await catalog.getCatalogFresh();
  const before = (await catalog.getCatalogFresh()).find((s) => s.slug === "peppermint");
  const hid = await catalog.setProductHidden("peppermint", true);
  const afterHide = await catalog.getCatalogFresh();
  t.check("hiding returns the soap, hidden, and it is saved", hid.hidden === true && afterHide.find((s) => s.slug === "peppermint").hidden === true);
  const pAfter = afterHide.find((s) => s.slug === "peppermint");
  t.check("nothing else about that soap changes (name, photo, text, position)", pAfter.name === before.name && pAfter.image === before.image && pAfter.description === before.description && pAfter.sortOrder === before.sortOrder && JSON.stringify(pAfter.ingredients) === JSON.stringify(before.ingredients));
  t.check("no other soap is touched, and the catalog still holds all 13 (nothing deleted)", afterHide.length === 13 && afterHide.filter((s) => s.hidden).length === 1);
  t.check("hiding twice is harmless", (await catalog.setProductHidden("peppermint", true)).hidden === true && (await catalog.getCatalogFresh()).filter((s) => s.hidden).length === 1);
  t.check("showing it again works", (await catalog.setProductHidden("peppermint", false)).hidden === false && (await catalog.getCatalogFresh()).every((s) => !s.hidden));
  let unknownThrew = false;
  try {
    await catalog.setProductHidden("not-a-soap", true);
  } catch (e) {
    unknownThrew = /Unknown product/.test(e.message);
  }
  t.check("an unknown soap is rejected, not created", unknownThrew && (await catalog.getCatalogFresh()).length === 13);
  const hiddenOne = await catalog.setProductHidden("charcoal-aloe", true);
  t.check("works for any of the original soaps, and a hidden one stays findable for old orders", catalog.findProduct(await catalog.getCatalogFresh(), "charcoal-aloe")?.name === hiddenOne.name && !catalog.visibleProducts(await catalog.getCatalogFresh()).some((s) => s.slug === "charcoal-aloe"));
  await catalog.setProductHidden("charcoal-aloe", false);

  t.section("races and outages");
  h.resetRedis();
  const results = await Promise.all(Array.from({ length: 5 }, () => catalog.getCatalogFresh()));
  t.check("5 simultaneous first reads: exactly 13 soaps exist, none duplicated", Object.keys(hashes["catalog:products"]).length === 13);
  t.check("...and every reader got all 13", results.every((r) => r.length === 13));
  h.redis.down = true;
  let threw = false;
  try {
    await catalog.getCatalogFresh();
  } catch {
    threw = true;
  }
  h.redis.down = false;
  t.check("Redis down: the read throws (no silent fallback, by decision)", threw);

  t.finish();
})().catch((e) => {
  console.log("ERROR", e);
  process.exit(1);
});
