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
    slug: "milk-and-collagen",
    name: "Milk and Collagen",
    tagline: "Nourishing & Moisturizing",
    price: 9.99,
    gradient: "from-amber-100 via-orange-50 to-yellow-50",
    image: "/assets/images/shop/milk_and_collagen.png",
    description:
      "A creamy, moisturizing bar made with real goat milk to nourish and soothe the skin.",
    ingredients: ["Goat Milk"],
  },
  {
    slug: "oatmeal-goat-milk",
    name: "Oatmeal Goat Milk",
    tagline: "Soothing & Exfoliating",
    price: 9.99,
    gradient: "from-amber-100 via-orange-50 to-yellow-50",
    image: "/assets/images/shop/oatmeal_goat_milk.png",
    description:
      "A gently exfoliating bar with ground oatmeal and real goat milk to soothe and soften the skin.",
    ingredients: ["Oatmeal", "Goat Milk"],
  },
  {
    slug: "unscented-goat-milk",
    name: "Unscented Goat Milk",
    tagline: "Gentle & Fragrance-Free",
    price: 9.99,
    gradient: "from-amber-50 via-yellow-50 to-orange-50",
    image: "/assets/images/shop/unscented_goat_milk.png",
    description:
      "A gentle, fragrance-free bar made with real goat milk — nourishing for sensitive skin.",
    ingredients: ["Goat Milk"],
  },
  {
    slug: "black-soap-charcoal",
    name: "Black Soap Charcoal",
    tagline: "Deep Cleansing & Purifying",
    price: 9.99,
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
    price: 9.99,
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
    price: 9.99,
    gradient: "from-emerald-100 via-teal-50 to-lime-50",
    image: "/assets/images/shop/tea_tree_mint.png",
    description:
      "A clarifying blend of tea tree and mint, crafted to refresh the skin and support a healthy-looking complexion.",
    ingredients: ["Tea Tree", "Mint"],
  },
  {
    slug: "cherry-almond",
    name: "Cherry Almond",
    tagline: "Sweet & Nourishing",
    price: 9.99,
    gradient: "from-rose-200 via-red-100 to-orange-50",
    image: "/assets/images/shop/cherry_almond.png",
    description:
      "A sweet, dessert-inspired bar with cherry and almond to nourish and soften the skin.",
    ingredients: ["Cherry", "Almond"],
  },
  {
    slug: "eucalyptus-aloe",
    name: "Eucalyptus Aloe",
    tagline: "Soothing & Refreshing",
    price: 9.99,
    gradient: "from-teal-200 via-emerald-100 to-cyan-50",
    image: "/assets/images/shop/eucalyptus_aloe.png",
    description:
      "A soothing blend of eucalyptus and aloe vera, crafted to refresh the skin and calm irritation.",
    ingredients: ["Eucalyptus", "Aloe Vera"],
  },
  {
    slug: "almond-coconut",
    name: "Almond Coconut",
    tagline: "Nourishing & Smoothing",
    price: 9.99,
    gradient: "from-amber-100 via-orange-50 to-yellow-50",
    image: "/assets/images/shop/almond_coconut.png",
    description:
      "A nourishing bar with almond and coconut to smooth and soften the skin.",
    ingredients: ["Almond", "Coconut"],
  },
  {
    slug: "cool-spring-scrub",
    name: "Cool Spring Scrub",
    tagline: "Exfoliating & Refreshing",
    price: 9.99,
    gradient: "from-teal-200 via-emerald-100 to-cyan-50",
    image: "/assets/images/shop/cool_spring_scrub.png",
    description:
      "A refreshing scrub bar with coarse sea salt to exfoliate and invigorate the skin.",
    ingredients: ["Sea Salt"],
  },
  {
    slug: "oatmeal-honey",
    name: "Oatmeal Honey",
    tagline: "Soothing & Nourishing",
    price: 9.99,
    gradient: "from-amber-100 via-orange-50 to-yellow-50",
    image: "/assets/images/shop/oatmeal_honey.png",
    description:
      "A soothing bar with ground oatmeal and honey to gently nourish and comfort the skin.",
    ingredients: ["Oatmeal", "Honey"],
  },
  {
    slug: "charcoal-aloe",
    name: "Charcoal Aloe",
    tagline: "Purifying & Soothing",
    price: 9.99,
    gradient: "from-neutral-800 via-neutral-700 to-neutral-600",
    image: "/assets/images/shop/charcoal_aloe.png",
    description:
      "A purifying bar with activated charcoal and aloe vera to deeply cleanse while soothing the skin.",
    ingredients: ["Activated Charcoal", "Aloe Vera"],
  },
  {
    slug: "lemongrass-lavender",
    name: "Lemongrass Lavender",
    tagline: "Calming & Uplifting",
    price: 9.99,
    gradient: "from-purple-200 via-purple-100 to-lime-100",
    image: "/assets/images/shop/lemongrass_lavender.png",
    description:
      "A calming blend of lemongrass and lavender, crafted to uplift the senses and soften the skin.",
    ingredients: ["Lemongrass", "Lavender"],
  },
];
