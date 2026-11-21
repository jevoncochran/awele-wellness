const { createHarness, createReporter, Redirect } = require("./harness.cjs");

const h = createHarness();
const t = createReporter("edit a soap: saving changes, photo replacement, safety");

process.env.BLOB_STORE_ID = "store_AbC123";
const PHOTO_A = "https://abc123.public.blob.vercel-storage.com/soaps/photo-AAA.jpg";
const PHOTO_B = "https://abc123.public.blob.vercel-storage.com/soaps/photo-BBB.jpg";

function form(fields) {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
}
const base = (slug, extra = {}) => ({
  slug,
  name: "Peppermint Fresh",
  tagline: "Cool & Clean",
  description: "A refreshing peppermint bar, now with a new description.",
  ingredients: "Peppermint, Shea Butter",
  image: "/assets/images/shop/peppermint.png",
  ...extra,
});

(async () => {
  const input = h.load("lib/product-input");
  const catalog = h.load("lib/catalog");
  const actions = h.load("app/admin/actions");
  const seed = h.load("lib/products");
  const { hashes } = h.redis;

  await catalog.getCatalogFresh();
  const orig = (await catalog.getCatalogFresh()).find((p) => p.slug === "peppermint");

  t.section("the address 'new' is reserved");
  t.check("a soap named \"New\" gets new-2 (so its edit page can't clash with the Add page)", input.uniqueSlug("new", new Set()) === "new-2" && input.uniqueSlug("new", new Set(["new-2"])) === "new-3" && input.uniqueSlug("newer", new Set()) === "newer");

  t.section("saving edits in the catalog");
  await catalog.setProductHidden("peppermint", true);
  const inputs = { name: "Peppermint Fresh", tagline: "Cool & Clean", description: "New description for this bar.", ingredients: ["Peppermint", "Shea Butter"], image: PHOTO_A };
  const { product, previousImage } = await catalog.updateProduct("peppermint", inputs);
  const after = (await catalog.getCatalogFresh()).find((p) => p.slug === "peppermint");
  t.check("text and photo are saved", JSON.stringify([after.name, after.tagline, after.description, after.ingredients, after.image]) === JSON.stringify([inputs.name, inputs.tagline, inputs.description, inputs.ingredients, PHOTO_A]));
  t.check("the old photo is reported so it can be cleaned up", previousImage === "/assets/images/shop/peppermint.png");
  t.check("address, price, position and hidden state are NOT changed by an edit", after.slug === "peppermint" && after.price === seed.SOAP_PRICE && after.sortOrder === orig.sortOrder && after.hidden === true && after.gradient === orig.gradient);
  t.check("no other soap changed and nothing was added", (await catalog.getCatalogFresh()).length === 13 && seed.SEED_PRODUCTS.filter((s) => s.slug !== "peppermint").every((s) => (hashes["catalog:products"][s.slug] ?? "").includes(s.name)));
  await catalog.setProductHidden("peppermint", false);

  let err = null;
  try { await catalog.updateProduct("not-a-soap", inputs); } catch (e) { err = e; }
  t.check("an unknown soap is rejected, not created", /Unknown product/.test(err?.message) && (await catalog.getCatalogFresh()).length === 13);
  err = null;
  try { await catalog.updateProduct("peppermint", { ...inputs, name: "tea TREE mint" }); } catch (e) { err = e; }
  t.check("renaming to another soap's name is refused", err instanceof catalog.DuplicateProductError && (await catalog.getCatalogFresh()).find((p) => p.slug === "peppermint").name === "Peppermint Fresh");
  const same = await catalog.updateProduct("peppermint", { ...inputs, name: "PEPPERMINT FRESH" });
  t.check("changing only the capitalisation of its own name is fine", same.product.name === "PEPPERMINT FRESH");
  await catalog.updateProduct("peppermint", inputs);

  t.section("the Edit form's server action");
  h.next.updatedTags.length = 0;
  h.next.revalidated.length = 0;
  async function run(fields) {
    try {
      return await actions.updateProduct({ status: "idle" }, form(fields));
    } catch (e) {
      if (e instanceof Redirect) return { redirect: e.to };
      throw e;
    }
  }
  const snapshot = () => JSON.stringify(hashes["catalog:products"]);

  h.auth.loggedIn = false;
  const s0 = snapshot();
  let res = await run(base("peppermint", { image: PHOTO_A }));
  t.check("logged out: sent to the login, nothing changed", res.redirect === "/admin/login" && snapshot() === s0);
  h.auth.loggedIn = true;

  res = await run(base("not-a-soap"));
  t.check("unknown soap: a clear message, nothing created", res.status === "error" && /no longer exists/.test(res.message) && !hashes["catalog:products"]["not-a-soap"]);
  res = await run(base("peppermint", { name: "", image: PHOTO_A }));
  t.check("invalid fields: messages returned, nothing saved", res.status === "error" && res.fieldErrors.name && snapshot() === s0);
  res = await run(base("peppermint", { image: "https://evil.example/x.jpg" }));
  t.check("a photo from anywhere but our store is refused", res.status === "error" && res.fieldErrors.image && snapshot() === s0);
  res = await run(base("peppermint", { image: "/assets/images/shop/other.png" }));
  t.check("a different local path is refused too (only its own current photo may stay)", !!res.fieldErrors?.image);
  res = await run(base("peppermint", { name: "Tea Tree Mint", image: PHOTO_A }));
  t.check("another soap's name: refused on the name field", res.status === "error" && /already has that name/.test(res.fieldErrors.name) && snapshot() === s0);
  t.check("none of those deleted any photo", h.blob.deleted.length === 0);

  // current photo is PHOTO_A (set above)
  res = await run(base("peppermint", { image: PHOTO_A, description: "Edited again, same photo kept." }));
  t.check("saved, back to the list with the confirmation", res.redirect === "/admin?saved=peppermint");
  t.check("...shop cache expired and admin list refreshed", h.next.updatedTags.includes("catalog") && h.next.revalidated.includes("/admin"));
  t.check("...text updated, same photo kept, and that photo was NOT deleted", (await catalog.getCatalogFresh()).find((p) => p.slug === "peppermint").description === "Edited again, same photo kept." && h.blob.deleted.length === 0);

  res = await run(base("peppermint", { image: PHOTO_B }));
  t.check("replacing the photo saves the new one", res.redirect === "/admin?saved=peppermint" && (await catalog.getCatalogFresh()).find((p) => p.slug === "peppermint").image === PHOTO_B);
  t.check("...and deletes the OLD uploaded photo (only that one)", h.blob.deleted.length === 1 && h.blob.deleted[0] === PHOTO_A);

  const ttm = (await catalog.getCatalogFresh()).find((p) => p.slug === "tea-tree-mint");
  res = await run(base("tea-tree-mint", { name: "Tea Tree Mint", tagline: "Minty Fresh", image: ttm.image }));
  t.check("editing an original soap's text while keeping its built-in photo works", res.redirect === "/admin?saved=tea-tree-mint" && (await catalog.getCatalogFresh()).find((p) => p.slug === "tea-tree-mint").tagline === "Minty Fresh" && h.blob.deleted.length === 1);

  // original soap with a local photo: first upload replaces it; the site's own file is never deleted
  res = await run(base("tea-tree-mint", { name: "Tea Tree Mint", image: PHOTO_A }));
  t.check("an original soap's built-in photo can be replaced", res.redirect === "/admin?saved=tea-tree-mint" && (await catalog.getCatalogFresh()).find((p) => p.slug === "tea-tree-mint").image === PHOTO_A);
  t.check("...and the site's own image file is never sent for deletion", h.blob.deleted.length === 1);

  h.blob.deleted.length = 0;
  h.blob.failDelete = true;
  res = await t.quiet(() => run(base("peppermint", { image: PHOTO_A })));
  h.blob.failDelete = false;
  t.check("the old photo can't be deleted: the edit is still saved (best effort cleanup)", res.redirect === "/admin?saved=peppermint" && (await catalog.getCatalogFresh()).find((p) => p.slug === "peppermint").image === PHOTO_A);

  await catalog.setProductHidden("peppermint", true);
  hashes["inventory:stock"] = { ...(hashes["inventory:stock"] ?? {}), peppermint: 4 };
  res = await run(base("peppermint", { image: PHOTO_A, tagline: "Cooler still" }));
  const pep = (await catalog.getCatalogFresh()).find((p) => p.slug === "peppermint");
  t.check("editing a hidden soap keeps it hidden, and its stock is untouched", res.redirect === "/admin?saved=peppermint" && pep.hidden === true && hashes["inventory:stock"].peppermint === 4);
  t.check("its address is unchanged even though it was renamed earlier", pep.slug === "peppermint" && pep.name === "Peppermint Fresh");

  h.redis.down = true;
  res = await t.quiet(() => run(base("peppermint", { image: PHOTO_A })));
  h.redis.down = false;
  t.check("database down: a plain error, nothing half-saved", res.status === "error" && /Nothing was saved|Nothing was changed/.test(res.message));

  t.finish();
})().catch((e) => {
  console.log("ERROR", e);
  process.exit(1);
});
