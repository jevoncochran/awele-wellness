const { createHarness, createReporter, Redirect } = require("./harness.cjs");

const h = createHarness();
const t = createReporter("add a soap: form checks, address, creation, safety");

process.env.BLOB_STORE_ID = "store_AbC123";
const PHOTO = "https://abc123.public.blob.vercel-storage.com/soaps/photo-Qx1.jpg";

function form(fields) {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
}
const GOOD = {
  name: "Rose Clay",
  tagline: "Soothing & Gentle",
  description: "A gentle bar made with rose clay for sensitive skin.",
  ingredients: "Rose Clay, Shea Butter",
  image: PHOTO,
  stock: "",
};

(async () => {
  const input = h.load("lib/product-input");
  const catalog = h.load("lib/catalog");
  const actions = h.load("app/admin/actions");
  const seed = h.load("lib/products");
  const { hashes } = h.redis;

  t.section("slug (web address) from the name");
  t.check("plain, accented and symbol names", input.slugify("Rose Clay") === "rose-clay" && input.slugify("Crème Brûlée") === "creme-brulee" && input.slugify("Cherry & Almond!") === "cherry-and-almond" && input.slugify("  --Oat  Milk--  ") === "oat-milk");
  t.check("a name with no letters or digits gives nothing", input.slugify("!!! ???") === "" && input.slugify("") === "");
  t.check("long names are cut to 50 without a trailing dash", input.slugify("a".repeat(49) + " bbb").length <= 50 && !input.slugify("a".repeat(49) + " bbb").endsWith("-"));
  t.check("slugs only ever contain a-z, 0-9 and single dashes", /^[a-z0-9]+(-[a-z0-9]+)*$/.test(input.slugify("../../etc/passwd <script>")));
  t.check("taken address gets -2, -3...", input.uniqueSlug("rose", new Set()) === "rose" && input.uniqueSlug("rose", new Set(["rose"])) === "rose-2" && input.uniqueSlug("rose", new Set(["rose", "rose-2"])) === "rose-3");

  t.section("reading and checking the form");
  let r = input.parseProductForm(form(GOOD));
  t.check("a complete form is accepted", r.ok && r.value.name === "Rose Clay" && r.value.ingredients.join("|") === "Rose Clay|Shea Butter" && r.value.image === PHOTO);
  r = input.parseProductForm(form({ ...GOOD, name: "  Rose \n  Clay\t", ingredients: " Oats ,, oats ,  Honey ,\n Aloe " }));
  t.check("spaces and line breaks are tidied; repeated/empty ingredients dropped", r.ok && r.value.name === "Rose Clay" && r.value.ingredients.join("|") === "Oats|Honey|Aloe");
  r = input.parseProductForm(form({ ...GOOD, image: "" }));
  t.check("photo is optional", r.ok && r.value.image === undefined);
  r = input.parseProductForm(form({ name: "", tagline: "", description: "", ingredients: "", image: "" }));
  t.check("empty form: every field reports a problem, in plain words", !r.ok && ["name", "tagline", "description", "ingredients"].every((k) => r.errors[k]));
  r = input.parseProductForm(form({ ...GOOD, name: "x" }));
  t.check("too-short name refused", !r.ok && !!r.errors.name);
  r = input.parseProductForm(form({ ...GOOD, name: "n".repeat(61) }));
  t.check("too-long name refused", !r.ok && !!r.errors.name);
  r = input.parseProductForm(form({ ...GOOD, name: "!!!??" }));
  t.check("a name with no letters or numbers refused", !r.ok && /letter or number/.test(r.errors.name));
  r = input.parseProductForm(form({ ...GOOD, description: "d".repeat(1001) }));
  t.check("too-long description refused", !r.ok && !!r.errors.description);
  r = input.parseProductForm(form({ ...GOOD, ingredients: Array.from({ length: 31 }, (_, i) => "i" + i).join(",") }));
  t.check("more than 30 ingredients refused", !r.ok && !!r.errors.ingredients);
  r = input.parseProductForm(form({ ...GOOD, ingredients: "x".repeat(61) }));
  t.check("an over-long ingredient (missing commas) refused", !r.ok && !!r.errors.ingredients);
  r = input.parseProductForm(form({ ...GOOD, image: "https://evil.example/a.jpg" }));
  t.check("a photo address that isn't ours is refused", !r.ok && !!r.errors.image);
  r = input.parseProductForm(form({ ...GOOD, image: "/assets/images/shop/milk_and_collagen.png" }));
  t.check("...including a local path (new soaps can't point at site files)", !r.ok && !!r.errors.image);
  r = input.parseProductForm(form({ ...GOOD, image: "/assets/images/shop/milk_and_collagen.png" }), "/assets/images/shop/milk_and_collagen.png");
  t.check("...but a soap's own existing photo may stay (used by the edit form)", r.ok);
  r = input.parseProductForm(form({ ...GOOD, name: "<script>alert(1)</script>" }));
  t.check("markup in text is kept as plain text (React escapes it on display)", r.ok && r.value.name === "<script>alert(1)</script>");

  t.section("adding to the catalog");
  await catalog.getCatalogFresh();
  const parsed = input.parseProductForm(form(GOOD)).value;
  const added = await catalog.addProduct(parsed);
  let list = await catalog.getCatalogFresh();
  t.check("the new soap is saved with a generated address, visible, shared price", added.slug === "rose-clay" && !added.hidden && added.price === seed.SOAP_PRICE && list.some((p) => p.slug === "rose-clay"));
  t.check("it goes last in the shop (after the 13)", list.length === 14 && list.at(-1).slug === "rose-clay" && added.sortOrder === 13);
  t.check("it gets a card color from the palette", seed.GRADIENT_PALETTE.includes(added.gradient));
  t.check("name, text, ingredients and photo are stored as typed", JSON.stringify([added.name, added.tagline, added.description, added.ingredients, added.image]) === JSON.stringify([parsed.name, parsed.tagline, parsed.description, parsed.ingredients, PHOTO]));
  t.check("the original 13 are untouched", seed.SEED_PRODUCTS.every((s) => list.find((p) => p.slug === s.slug)?.name === s.name));

  let dup = null;
  try {
    await catalog.addProduct({ ...parsed, name: "rose CLAY" });
  } catch (e) {
    dup = e;
  }
  t.check("same name again (any capitalisation) is refused", dup instanceof catalog.DuplicateProductError && (await catalog.getCatalogFresh()).length === 14);
  try {
    await catalog.addProduct({ ...parsed, name: "Peppermint" });
    dup = null;
  } catch (e) {
    dup = e;
  }
  t.check("an original soap's name is protected too", dup instanceof catalog.DuplicateProductError);

  const near = await catalog.addProduct({ ...parsed, name: "Rose-Clay!" });
  t.check("different name that makes the same address gets -2, nobody is overwritten", near.slug === "rose-clay-2" && (await catalog.getCatalogFresh()).find((p) => p.slug === "rose-clay").name === "Rose Clay");

  const racers = await Promise.all(["Zinc Bar", "Zinc-Bar", "Zinc  Bar!"].map((name) => catalog.addProduct({ ...parsed, name }).catch((e) => e)));
  const slugs = racers.filter((x) => x.slug).map((x) => x.slug);
  t.check("three soaps whose names make the same address at the same instant: all saved, none lost", slugs.length === 3 && new Set(slugs).size === 3);
  hashes["catalog:products"]["rogue"] = JSON.stringify({ slug: "rogue", name: "Rogue", tagline: "", description: "", ingredients: [], gradient: "g" });
  const afterRogue = await catalog.addProduct({ ...parsed, name: "After Rogue" });
  t.check("a damaged record with no position doesn't push new soaps to a huge position", afterRogue.sortOrder < 100);
  delete hashes["catalog:products"]["rogue"];

  t.section("the Add form's server action");
  const invs = h.load("lib/inventory");
  h.resetRedis();
  h.next.updatedTags.length = 0;
  h.next.revalidated.length = 0;
  async function run(fields) {
    try {
      return await actions.createProduct({ status: "idle" }, form(fields));
    } catch (e) {
      if (e instanceof Redirect) return { redirect: e.to };
      throw e;
    }
  }
  h.auth.loggedIn = false;
  let res = await run(GOOD);
  t.check("logged out: sent to the login, nothing saved", res.redirect === "/admin/login" && !hashes["catalog:products"]);
  h.auth.loggedIn = true;
  await catalog.getCatalogFresh(); // first read of a fresh database imports the 13

  res = await run({ ...GOOD, name: "" });
  t.check("invalid form: field messages returned, nothing saved", res.status === "error" && res.fieldErrors.name && Object.keys(hashes["catalog:products"] ?? {}).length === 13);
  res = await run({ ...GOOD, stock: "-3" });
  t.check("negative stock refused", res.status === "error" && !!res.fieldErrors.stock);
  res = await run({ ...GOOD, stock: "2.5" });
  t.check("fractional stock refused", !!res.fieldErrors?.stock);
  res = await run({ ...GOOD, stock: "abc" });
  t.check("non-numeric stock refused", !!res.fieldErrors?.stock);
  res = await run({ ...GOOD, stock: "10000" });
  t.check("stock over the maximum refused", !!res.fieldErrors?.stock);
  t.check("none of those saved anything", Object.keys(hashes["catalog:products"]).length === 13);

  res = await run(GOOD);
  t.check("valid form, no stock: goes back to the list with the confirmation", res.redirect === "/admin?added=rose-clay");
  t.check("...the soap is live, and untracked (sold without a limit)", (await catalog.getCatalogFresh()).find((p) => p.slug === "rose-clay")?.hidden === false && !("rose-clay" in (hashes["inventory:stock"] ?? {})));
  t.check("...the shop's cache was expired and the admin list refreshed", h.next.updatedTags.includes("catalog") && h.next.revalidated.includes("/admin"));

  res = await run({ ...GOOD, name: "Oat Bar", stock: "12" });
  t.check("with starting stock: saved, goes back to the list", res.redirect === "/admin?added=oat-bar");
  const oat = (await catalog.getCatalogFresh()).find((p) => p.slug === "oat-bar");
  t.check("...stock is 12 and the soap ends up visible", hashes["inventory:stock"]["oat-bar"] === 12 && oat.hidden === false);
  res = await run({ ...GOOD, name: "Sold Out Bar", stock: "0" });
  t.check("starting stock of 0 means sold out (and is allowed)", res.redirect === "/admin?added=sold-out-bar" && hashes["inventory:stock"]["sold-out-bar"] === 0);

  res = await run(GOOD);
  t.check("same name again: a clear message on the name field, nothing added", res.status === "error" && /already exists/.test(res.fieldErrors.name));

  // stock step fails after the soap was created -> it must NOT go live untracked
  const realHset = h.redis.hashes;
  const inv = h.load("lib/inventory");
  const originalSave = inv.saveStock;
  inv.saveStock = async () => {
    throw new Error("stock write failed");
  };
  res = await t.quiet(() => run({ ...GOOD, name: "Risky Bar", stock: "5" }));
  inv.saveStock = originalSave;
  const risky = (await catalog.getCatalogFresh()).find((p) => p.slug === "risky-bar");
  t.check("stock can't be saved: the soap stays HIDDEN (never on sale as unlimited) and the owner is told", risky?.hidden === true && res.status === "error" && /hidden/i.test(res.message) && /Don't add it again/.test(res.message));

  h.redis.down = true;
  res = await t.quiet(() => run({ ...GOOD, name: "Outage Bar" }));
  h.redis.down = false;
  t.check("database down: a plain error, nothing half-saved", res.status === "error" && /Nothing was added/.test(res.message));

  t.finish();
})().catch((e) => {
  console.log("ERROR", e);
  process.exit(1);
});
