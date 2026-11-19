const { createHarness, createReporter } = require("./harness.cjs");

const h = createHarness();
const t = createReporter("emails: customer confirmation and owner notification");

(async () => {
  const customerEmail = h.load("lib/email/order-confirmation");
  const ownerEmail = h.load("lib/email/owner-notification");

  const address = { name: "Test Buyer", line1: "123 Main St", line2: "Apt 4", city: "Oakland", state: "CA", postalCode: "94607", country: "US" };
  const customerData = (discount) => ({
    customerName: "Test", orderReference: "pi_x", orderDate: new Date("2026-11-13T12:00:00Z"),
    items: [{ name: "Peppermint", quantity: 2, price: 9.99 }, { name: "Cherry & <Almond>", quantity: 3, price: 9.99 }],
    subtotal: 49.95, discount, shipping: 14.95, total: discount ? 49.94 : 64.9,
    shippingAddress: address, paymentMethodLabel: "Visa ending in 4242",
  });
  const order = (over = {}) => ({
    reference: "pi_3Test123", createdAt: new Date("2026-11-13T12:00:00Z"),
    customer: { name: "Test Buyer", email: "buyer@example.com", phone: "510-555-0100" },
    items: [{ name: "Peppermint", quantity: 2, price: 9.99 }, { name: "Cherry Almond", quantity: 3, price: 9.99 }],
    subtotal: 49.95, discount: 14.96, shipping: 14.95, total: 49.94,
    paymentMethodLabel: "Visa ending in 4242", shippingAddress: address, ...over,
  });

  t.section("customer confirmation");
  const withSavings = customerEmail.buildOrderConfirmationEmail(customerData(14.96));
  t.check("shows a 'Bundle savings' row (HTML and text) when there is a discount", /Bundle savings/.test(withSavings.html) && /Bundle savings: -\$14\.96/.test(withSavings.text));
  const noSavings = customerEmail.buildOrderConfirmationEmail(customerData(0));
  t.check("no savings row when there isn't", !/Bundle savings/.test(noSavings.html) && !/Bundle savings/.test(noSavings.text));
  t.check("totals and reference are present", /\$49\.94/.test(withSavings.text) && /pi_x/.test(withSavings.text));
  t.check("item names are HTML-escaped", /Cherry &amp; &lt;Almond&gt;/.test(withSavings.html) && !/<Almond>/.test(withSavings.html));
  t.check("the customer email never mentions stock", !/\bstock\b|only \d+ left|sold out/i.test(withSavings.text));

  t.section("owner notification");
  const e1 = ownerEmail.buildOwnerNotificationEmail(order());
  t.check("subject names the buyer and the total", e1.subject === "New order from Test Buyer — $49.94");
  t.check("text lists customer, items to pack, totals and the address", /Test Buyer/.test(e1.text) && /buyer@example\.com/.test(e1.text) && /510-555-0100/.test(e1.text) && /Peppermint x2: \$19\.98/.test(e1.text) && /Bundle savings: -\$14\.96/.test(e1.text) && /Oakland, CA 94607/.test(e1.text));
  t.check("the customer's email is a mailto link", /href="mailto:buyer@example\.com"/.test(e1.html));
  const e2 = ownerEmail.buildOwnerNotificationEmail(order({ items: [{ name: "Peppermint", quantity: 1, price: 9.99 }], subtotal: 9.99, discount: 0, shipping: 2.99, total: 12.98, customer: { name: "", email: null, phone: null } }));
  t.check("one bar, no discount, no contact details: '1 bar', no savings row, 'Not provided' twice", /1 bar &middot;/.test(e2.html) && !/Bundle savings/.test(e2.html) && (e2.html.match(/Not provided/g) || []).length === 2 && e2.subject.startsWith("New order from Customer"));
  const evil = ownerEmail.buildOwnerNotificationEmail(order({ customer: { name: '<script>alert(1)</script> "Bob"', email: 'x"><img src=x onerror=alert(1)>@e.com', phone: "<b>1</b>" }, paymentMethodLabel: "<i>Visa</i>", shippingAddress: { ...address, line1: "<img src=x>" } }), ["<u>sold out</u>"]);
  t.check("hostile names, emails, phones, addresses and stock notes are all escaped", !/<script>|<img |<b>|<i>|<u>/.test(evil.html));
  const withNotes = ownerEmail.buildOwnerNotificationEmail(order(), ["Cherry Almond is now sold out.", "⚠ Almond Coconut: more was bought than was in stock."]);
  t.check("stock notes appear in HTML and text when there are any", /Stock<\/h2>/.test(withNotes.html) && /now sold out/.test(withNotes.html) && /Stock:\nCherry Almond is now sold out\./.test(withNotes.text));
  t.check("no stock section when there is nothing to say", !/Stock<\/h2>/.test(e1.html) && !/Stock:/.test(e1.text));

  t.finish();
})().catch((e) => {
  console.log("ERROR", e);
  process.exit(1);
});
