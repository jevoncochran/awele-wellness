// Stock, payment endpoint, cart availability, admin stock save, order building
// and the Stripe webhook, all reading soaps from the catalog.
const { createHarness, createReporter, Redirect } = require("./harness.cjs");

const h = createHarness();
const t = createReporter("server: stock, checkout, availability, admin save, webhook");

(async () => {
  const catalog = h.load("lib/catalog");
  const inv = h.load("lib/inventory");
  const pl = h.load("lib/purchase-limits");
  const orders = h.load("lib/orders");
  const seed = h.load("lib/products");
  const pay = h.load("app/api/create-payment-intent/route");
  const avail = h.load("app/api/cart-availability/route");
  const actions = h.load("app/admin/actions");
  const hook = h.load("app/api/webhooks/stripe/route");
  const { hashes } = h.redis;
  const { created } = h.stripe;
  const { sent } = h.resend;

  // Play the owner: add a soap / hide a soap straight in the catalog.
  const addSoap = (slug, name, extra = {}) => {
    hashes["catalog:products"][slug] = JSON.stringify({ slug, name, tagline: "t", description: "d", ingredients: ["Oats"], gradient: seed.GRADIENT_PALETTE[0], sortOrder: 99, hidden: false, ...extra });
  };

  await catalog.getCatalogFresh(); // first read imports the 13
  addSoap("lavender-dream", "Lavender Dream");
  addSoap("secret-soap", "Secret Soap", { hidden: true });
  const L = (slug, quantity) => ({ slug, quantity });
  const lines = (a) => a.map(([slug, quantity]) => ({ slug, quantity }));

  t.section("shared helpers");
  t.check("describeUnavailable covers all three reasons", pl.describeUnavailable({ name: "A", reason: "sold_out", available: 0 }) === "A is sold out" && pl.describeUnavailable({ name: "A", reason: "unavailable", available: 0 }) === "A is no longer available" && pl.describeUnavailable({ name: "A", reason: "insufficient", available: 1 }) === "only 1 A is left" && pl.describeUnavailable({ name: "A", reason: "insufficient", available: 3 }) === "only 3 A are left");
  t.check("isRemoved: sold out / unavailable / zero left removed; some left is not", pl.isRemoved({ reason: "sold_out", available: 0 }) && pl.isRemoved({ reason: "unavailable", available: 0 }) && pl.isRemoved({ reason: "insufficient", available: 0 }) && !pl.isRemoved({ reason: "insufficient", available: 2 }));
  const fixed = pl.applyAvailability([{ slug: "a", quantity: 2 }, { slug: "b", quantity: 5 }, { slug: "c", quantity: 1 }, { slug: "d", quantity: 1 }], [{ slug: "a", reason: "unavailable", available: 0 }, { slug: "b", reason: "insufficient", available: 3 }, { slug: "c", reason: "sold_out", available: 0 }]);
  t.check("applyAvailability drops hidden + sold out, lowers short ones, keeps the rest", JSON.stringify(fixed) === JSON.stringify([{ slug: "b", quantity: 3 }, { slug: "d", quantity: 1 }]));

  t.section("inventory over the catalog");
  await inv.saveStock("peppermint", 5);
  await inv.saveStock("cherry-almond", 0);
  await inv.saveStock("lavender-dream", 4);
  await inv.saveStock("tea-tree-mint", 3);
  const stock = await inv.getInventory();
  t.check("stock covers the 13 originals plus owner-added soaps (and hidden ones)", Object.keys(stock).length === 15 && "lavender-dream" in stock && "secret-soap" in stock);
  t.check("tracked / sold-out / untracked read correctly", stock.peppermint.quantity === 5 && stock["cherry-almond"].soldOut && stock["milk-and-collagen"].quantity === null && stock["lavender-dream"].quantity === 4);
  let rejected = 0;
  for (const [s, q] of [["nope", 1], ["peppermint", -1], ["peppermint", 1.5], ["peppermint", 10000]]) {
    try {
      await inv.saveStock(s, q);
    } catch {
      rejected++;
    }
  }
  t.check("saveStock rejects unknown soaps and bad quantities, changing nothing", rejected === 4 && (await inv.getInventory()).peppermint.quantity === 5);
  await inv.saveStock("lavender-dream", 6);
  t.check("saveStock works for a soap the owner added", (await inv.getInventory())["lavender-dream"].quantity === 6);
  t.check("validateStockQuantity checks the number", inv.validateStockQuantity(0) === null && inv.validateStockQuantity(null) === null && inv.validateStockQuantity(-1) !== null && inv.validateStockQuantity(10000) !== null);
  const cat = await catalog.getCatalogFresh();
  const probs = inv.findUnavailable(await inv.getInventory(cat), lines([["peppermint", 6], ["cherry-almond", 1], ["secret-soap", 1], ["milk-and-collagen", 99], ["nope", 1]]), cat);
  t.check("findUnavailable: short, sold out and HIDDEN flagged; untracked and unknown ignored", probs.length === 3 && probs.find((p) => p.slug === "peppermint").reason === "insufficient" && probs.find((p) => p.slug === "cherry-almond").reason === "sold_out" && probs.find((p) => p.slug === "secret-soap").reason === "unavailable");
  t.check("a hidden soap is flagged even when stock can't be read", inv.findUnavailable({}, lines([["secret-soap", 1]]), cat).length === 1);
  h.redis.down = true;
  const open = await t.quiet(() => inv.getStorefrontInventory());
  h.redis.down = false;
  t.check("storefront stock read fails open to an empty answer (pages read it as 'available')", JSON.stringify(open) === "{}");
  const dec = await inv.decrementStock("peppermint", 2);
  t.check("decrement 5 -> 3", dec.tracked && dec.remaining === 3 && !dec.oversold);
  t.check("decrement on an untracked soap does nothing", !(await inv.decrementStock("milk-and-collagen", 2)).tracked && (await inv.getInventory())["milk-and-collagen"].quantity === null);
  const over = await inv.decrementStock("peppermint", 10);
  t.check("oversell clamps at 0 and is reported", over.oversold && over.remaining === 0);
  await inv.saveStock("peppermint", 5);

  t.section("payment endpoint");
  const shipping = { name: "T", address: { line1: "1 Main", city: "Oakland", state: "CA", postal_code: "94607", country: "US" } };
  const buy = async (items) => {
    created.length = 0;
    return pay.POST({ json: async () => ({ items, email: "b@example.com", shipping }) });
  };
  let r = await buy([L("peppermint", 2), L("tea-tree-mint", 1)]);
  t.check("in-stock order creates a PaymentIntent at the bundle price (3 bars = $28.97)", r.status === 200 && created.length === 1 && created[0].amount === 2897);
  r = await buy([L("lavender-dream", 2), L("milk-and-collagen", 1)]);
  t.check("an owner-added soap can be bought", r.status === 200 && JSON.parse(created[0].metadata.order_items_json).some((i) => i.slug === "lavender-dream"));
  r = await buy([L("cherry-almond", 1)]);
  t.check("sold out -> 409, no PaymentIntent", r.status === 409 && created.length === 0 && /sold out/.test(r.body.error));
  r = await buy([L("secret-soap", 1)]);
  t.check("HIDDEN soap -> 409 'no longer available', no PaymentIntent", r.status === 409 && created.length === 0 && /no longer available/.test(r.body.error) && r.body.unavailable[0].reason === "unavailable");
  r = await buy([L("tea-tree-mint", 4)]);
  t.check("more than is left -> 409 with the count", r.status === 409 && /only 3 Tea Tree Mint are left/.test(r.body.error));
  r = await buy([L("tea-tree-mint", 2), L("tea-tree-mint", 2)]);
  t.check("split lines are added together before the stock check", r.status === 409);
  r = await buy([L("peppermint", 21)]);
  t.check("20-per-soap cap is a 400", r.status === 400);
  r = await buy([L("nope", 1)]);
  t.check("unknown soap skipped -> empty cart 400", r.status === 400 && /empty or invalid/.test(r.body.error));
  h.redis.failCatalogRead = true;
  r = await t.quiet(() => buy([L("peppermint", 1)]));
  h.redis.failCatalogRead = false;
  t.check("catalog unreadable -> clean 503, nothing created", r.status === 503 && created.length === 0);
  h.redis.failStockRead = true;
  r = await t.quiet(() => buy([L("cherry-almond", 1)]));
  t.check("stock unreadable: order let through (fail open)...", r.status === 200 && created.length === 1);
  r = await t.quiet(() => buy([L("secret-soap", 1)]));
  t.check("...but a hidden soap is STILL refused", r.status === 409 && created.length === 0);
  h.redis.failStockRead = false;

  t.section("cart availability endpoint");
  const ask = (items) => avail.POST({ json: async () => ({ items }) });
  r = await ask([L("cherry-almond", 1), L("secret-soap", 1), L("tea-tree-mint", 5), L("peppermint", 1), L("lemongrass-lavender", 3)]);
  t.check("reports sold out, hidden and short; says nothing about fine soaps", r.body.checked === true && r.body.unavailable.length === 3 && !JSON.stringify(r.body).includes("peppermint") && !JSON.stringify(r.body).includes("lemongrass"));
  r = await ask([{ slug: 5, quantity: 1 }, { slug: "nope", quantity: 1 }, L("peppermint", 0)]);
  t.check("junk lines ignored", r.status === 200 && r.body.unavailable.length === 0);
  h.redis.failCatalogRead = true;
  r = await t.quiet(() => ask([L("cherry-almond", 1)]));
  h.redis.failCatalogRead = false;
  t.check("catalog unreadable: says nothing is wrong, checked:false", r.body.checked === false && r.body.unavailable.length === 0);

  t.section("admin stock save");
  const makeForm = (original = {}, edits = {}) => {
    const f = {};
    for (const p of cat) {
      const o = original[p.slug] ?? "";
      f[`original-${p.slug}`] = o;
      f[`quantity-${p.slug}`] = p.slug in edits ? edits[p.slug] : o;
    }
    return { get: (k) => (k in f ? f[k] : null) };
  };
  const save = (o, e) => actions.saveStockChanges({ status: "idle" }, makeForm(o, e));
  h.auth.loggedIn = false;
  let err = null;
  try {
    await save({}, { peppermint: "9" });
  } catch (e) {
    err = e;
  }
  h.auth.loggedIn = true;
  t.check("logged out: redirected, nothing saved", err instanceof Redirect && (await inv.getInventory()).peppermint.quantity === 5);
  h.next.revalidated.length = 0;
  h.next.updatedTags.length = 0;
  r = await save({ "lavender-dream": "6", peppermint: "5" }, { "lavender-dream": "2" });
  t.check("saves an owner-added soap; only the changed row is written", r.status === "saved" && /1 change: Lavender Dream/.test(r.message) && (await inv.getInventory())["lavender-dream"].quantity === 2);
  t.check("refreshes /admin and expires the stock tag", h.next.revalidated[0] === "/admin" && h.next.updatedTags.includes("inventory"));
  await inv.saveStock("peppermint", 2);
  await save({ peppermint: "5" }, { "tea-tree-mint": "3" });
  t.check("a stale page can't overwrite a newer count", (await inv.getInventory()).peppermint.quantity === 2);
  r = await save({}, { peppermint: "abc", "tea-tree-mint": "9" });
  t.check("bad input saves nothing at all", r.status === "error" && /Nothing was saved/.test(r.message) && (await inv.getInventory())["tea-tree-mint"].quantity === 3);
  h.redis.failCatalogRead = true;
  r = await t.quiet(() => save({}, { peppermint: "9" }));
  h.redis.failCatalogRead = false;
  t.check("catalog unreadable: clear error, nothing saved", r.status === "error" && /Nothing was saved/.test(r.message));

  t.section("admin hide / show");
  const vis = (slug, hidden) => ({ get: (k) => ({ slug, hidden: hidden ? "true" : "false" })[k] ?? null });
  const toggle = (slug, hidden) => actions.setProductVisibility({ status: "idle" }, vis(slug, hidden));
  h.auth.loggedIn = false;
  err = null;
  try {
    await toggle("peppermint", true);
  } catch (e) {
    err = e;
  }
  h.auth.loggedIn = true;
  t.check("logged out: redirected, nothing changed", err instanceof Redirect && !(await catalog.getCatalogFresh()).some((p) => p.slug === "peppermint" && p.hidden));
  h.next.updatedTags.length = 0;
  h.next.revalidated.length = 0;
  r = await toggle("peppermint", true);
  t.check("hiding saves it and says so", r.status === "saved" && /Peppermint is now hidden from the shop/.test(r.message) && (await catalog.getCatalogFresh()).find((p) => p.slug === "peppermint").hidden === true);
  t.check("it expires the catalog cache tag (so the shop updates at once) and refreshes the admin pages", h.next.updatedTags.includes("catalog") && h.next.revalidated.includes("/admin"));
  const hiddenBuy = await buy([L("peppermint", 1)]);
  t.check("...and checkout now refuses that soap", hiddenBuy.status === 409 && /no longer available/.test(hiddenBuy.body.error));
  r = await toggle("peppermint", false);
  t.check("showing it again saves and says so", r.status === "saved" && /visible in the shop again/.test(r.message) && !(await catalog.getCatalogFresh()).find((p) => p.slug === "peppermint").hidden);
  r = await t.quiet(() => toggle("not-a-soap", true));
  t.check("an unknown soap gives a clear error and creates nothing", r.status === "error" && /no longer exists/.test(r.message) && !(await catalog.getCatalogFresh()).some((p) => p.slug === "not-a-soap"));
  h.next.updatedTags.length = 0;
  h.redis.failCatalogRead = true;
  r = await t.quiet(() => toggle("peppermint", true));
  h.redis.failCatalogRead = false;
  t.check("database trouble: a clear error, no cache expiry, nothing changed", r.status === "error" && /Couldn't save/.test(r.message) && h.next.updatedTags.length === 0 && !(await catalog.getCatalogFresh()).find((p) => p.slug === "peppermint").hidden);
  r = await t.quiet(() => toggle("", true));
  t.check("a missing soap name is handled, not a crash", r.status === "error");

  t.section("orders + webhook");
  const makePI = (id, items, over = {}) => ({
    id, created: 1794600000, amount: 3000, receipt_email: "buyer@example.com",
    shipping: { name: "Test Buyer", phone: "510-555-0100", address: { line1: "1 Main", line2: null, city: "Oakland", state: "CA", postal_code: "94607", country: "US" } },
    metadata: { order_items_json: JSON.stringify(items), subtotal_cents: "2000", bundle_discount_cents: "0", shipping_cents: "1000" },
    payment_method: { type: "card", card: { brand: "visa", last4: "4242" } },
    ...over,
  });
  const stripeLike = { paymentMethods: { retrieve: async () => ({ type: "card", card: { brand: "visa", last4: "4242" } }) } };
  const built = await orders.buildOrderFromPaymentIntent(stripeLike, makePI("pi_o", [{ slug: "lavender-dream", quantity: 2 }, { slug: "secret-soap", quantity: 1 }, { slug: "gone", quantity: 1 }]));
  t.check("an order resolves owner-added AND hidden soaps; unknown slugs are dropped", built.ok && built.order.items.map((i) => i.name).join() === "Lavender Dream,Secret Soap" && built.order.items.every((i) => i.price === seed.SOAP_PRICE));
  h.redis.failCatalogRead = true;
  let threw = false;
  try {
    await t.quiet(() => orders.buildOrderFromPaymentIntent(stripeLike, makePI("pi_x", [{ slug: "peppermint", quantity: 1 }])));
  } catch {
    threw = true;
  }
  h.redis.failCatalogRead = false;
  t.check("catalog unreadable: order building throws (the webhook logs it; the payment is unaffected)", threw);

  const deliver = async (pi) => {
    h.stripe.currentPI = pi;
    return hook.POST({ headers: { get: () => "sig" }, text: async () => JSON.stringify({ type: "payment_intent.succeeded", data: { object: { id: pi.id, amount: pi.amount } } }) });
  };
  const to = (a) => sent.filter((m) => m.to === a);
  await inv.saveStock("lavender-dream", 3);
  await inv.saveStock("peppermint", 6);
  sent.length = 0;
  h.next.tagCalls.length = 0;
  const W = makePI("pi_W", [{ slug: "lavender-dream", quantity: 3 }, { slug: "peppermint", quantity: 1 }]);
  r = await t.quiet(() => deliver(W));
  t.check("webhook: 200; stock subtracted for owner-added + original soaps (3->0, 6->5)", r.status === 200 && (await inv.getInventory())["lavender-dream"].quantity === 0 && (await inv.getInventory()).peppermint.quantity === 5);
  t.check("webhook: both emails sent; the owner is told the new soap sold out", to("buyer@example.com").length === 1 && to("owner@example.com").length === 1 && /Lavender Dream is now sold out/.test(to("owner@example.com")[0].text));
  t.check("webhook: shop cache expired", h.next.tagCalls.length === 1 && h.next.tagCalls[0][0] === "inventory");
  sent.length = 0;
  await t.quiet(() => deliver(W));
  t.check("webhook: a repeat delivery changes nothing and sends nothing", sent.length === 0 && (await inv.getInventory()).peppermint.quantity === 5);

  t.finish();
})().catch((e) => {
  console.log("ERROR", e);
  process.exit(1);
});
