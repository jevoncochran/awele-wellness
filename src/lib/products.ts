export type Product = {
  slug: string;
  name: string;
  tagline: string;
  price: number;
  gradient: string;
  image?: string;
  description: string;
  ingredients: string[];
};

export const products: Product[] = [
  {
    slug: "goat-milk",
    name: "Goat Milk",
    tagline: "Nourishing & Moisturizing",
    price: 9.25,
    gradient: "from-amber-100 via-orange-50 to-yellow-50",
    image: "/assets/images/shop/goat_milk.png",
    description:
      "A creamy, moisturizing bar made with real goat milk to nourish and soothe the skin.",
    ingredients: ["Goat Milk"],
  },
  {
    slug: "black-soap-charcoal",
    name: "Black Soap Charcoal",
    tagline: "Deep Cleansing & Purifying",
    price: 9.25,
    gradient: "from-neutral-800 via-neutral-700 to-neutral-600",
    image: "/assets/images/shop/black_soap_charcoal.png",
    description:
      "A traditional black soap bar with activated charcoal, crafted to deeply cleanse and purify the skin.",
    ingredients: ["Activated Charcoal"],
  },
  {
    slug: "peppermint",
    name: "Peppermint",
    tagline: "Cooling & Energizing",
    price: 9.25,
    gradient: "from-teal-100 via-emerald-50 to-cyan-50",
    image: "/assets/images/shop/peppermint.png",
    description:
      "A crisp, cooling bar infused with peppermint to energize the senses and refresh the skin.",
    ingredients: ["Peppermint"],
  },
  {
    slug: "tea-tree-mint",
    name: "Tea Tree Mint",
    tagline: "Clarifying & Refreshing",
    price: 9.25,
    gradient: "from-emerald-100 via-teal-50 to-lime-50",
    image: "/assets/images/shop/tea_tree_mint.png",
    description:
      "A clarifying blend of tea tree and mint, crafted to refresh the skin and support a healthy-looking complexion.",
    ingredients: ["Tea Tree", "Mint"],
  },
  {
    slug: "cherry-almond-pie",
    name: "Cherry Almond Pie",
    tagline: "Sweet & Nourishing",
    price: 9.25,
    gradient: "from-rose-200 via-red-100 to-orange-50",
    image: "/assets/images/shop/cherry_almond_pie.png",
    description:
      "A sweet, dessert-inspired bar with cherry and almond to nourish and soften the skin.",
    ingredients: ["Cherry", "Almond"],
  },
  {
    slug: "eucalyptus-aloe",
    name: "Eucalyptus Aloe",
    tagline: "Soothing & Refreshing",
    price: 9.25,
    gradient: "from-teal-200 via-emerald-100 to-cyan-50",
    image: "/assets/images/shop/eucalyptus_aloe.png",
    description:
      "A soothing blend of eucalyptus and aloe vera, crafted to refresh the skin and calm irritation.",
    ingredients: ["Eucalyptus", "Aloe Vera"],
  },
];
