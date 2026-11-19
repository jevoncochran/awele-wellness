const { createHarness, createReporter } = require("./harness.cjs");

const h = createHarness();
const t = createReporter("pricing: bundles, upsell hint, purchase limits");

(async () => {
  const pricing = h.load("lib/pricing");
  const limits = h.load("lib/purchase-limits");

  t.section("bundle prices (any mix of soaps, best split for 5+)");
  const expected = [999, 1500, 2000, 2500, 3499, 4000, 4500, 5000];
  expected.forEach((want, i) => t.check(`${i + 1} bar(s) = ${want}`, pricing.bundlePriceCents(999, i + 1) === want));

  t.section("whole carts");
  const mixed = pricing.priceCart([{ priceCents: 999, quantity: 2 }, { priceCents: 999, quantity: 3 }]);
  t.check("2 + 3 bars from different soaps price as 5 bars, shipping $2.99 per bar", mixed.barCount === 5 && mixed.subtotalCents === 4995 && mixed.discountCents === 1496 && mixed.shippingCents === 1495 && mixed.totalCents === 4994);
  t.check("one bar: no discount", pricing.priceCart([{ priceCents: 999, quantity: 1 }]).discountCents === 0);
  const empty = pricing.priceCart([]);
  t.check("empty cart is all zeros", empty.totalCents === 0 && empty.barCount === 0 && empty.discountCents === 0);
  t.check("the discount never goes negative even with odd prices", pricing.priceCart([{ priceCents: 100, quantity: 2 }]).discountCents === 0);

  t.section("'add N more' hint");
  for (let n = 1; n <= 10; n++) {
    const lines = [{ priceCents: 999, quantity: n }];
    const hint = pricing.nextBundleHint(lines);
    const now = pricing.priceCart(lines).discountCents;
    const after = pricing.priceCart([{ priceCents: 999, quantity: n + hint.barsToAdd }]).discountCents;
    t.check(`${n} bar(s): add ${hint.barsToAdd} to save ${hint.savingsCents} more (matches the real discount change)`, after - now === hint.savingsCents);
  }
  t.check("4 bars looks past the useless 5th and says add 2", pricing.nextBundleHint([{ priceCents: 999, quantity: 4 }]).barsToAdd === 2);
  t.check("no hint for an empty cart", pricing.nextBundleHint([]) === null);

  t.section("order amounts from payment metadata");
  const a = pricing.orderAmountsFromMetadata({ subtotal_cents: "4995", bundle_discount_cents: "1496", shipping_cents: "1495" }, 4995, 4994);
  t.check("new orders read the recorded amounts", a.subtotalCents === 4995 && a.discountCents === 1496 && a.shippingCents === 1495);
  const legacy = pricing.orderAmountsFromMetadata({}, 1998, 2596);
  t.check("old orders without them fall back to list price, shipping = total - subtotal", legacy.discountCents === 0 && legacy.shippingCents === 598);

  t.section("purchase limits");
  t.check("untracked soap: only the 20-per-soap cap", limits.purchaseLimit(null) === 20);
  t.check("tracked below the cap: stock is the limit", limits.purchaseLimit(3) === 3 && limits.purchaseLimit(27) === 20);
  t.check("sold out / negative allow nothing", limits.purchaseLimit(0) === 0 && limits.purchaseLimit(-4) === 0);
  t.check("what's already in the cart counts against stock", limits.remainingToAdd(4, 3) === 1 && limits.remainingToAdd(9, 9) === 0 && limits.remainingToAdd(2, 5) === 0);
  t.check("untracked with 20 already in the cart: nothing more", limits.remainingToAdd(null, 20) === 0);

  t.finish();
})().catch((e) => {
  console.log("ERROR", e);
  process.exit(1);
});
