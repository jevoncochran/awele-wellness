export type Product = {
  slug: string;
  name: string;
  tagline: string;
  price: number;
  gradient: string;
  description: string;
  ingredients: string[];
};

export const products: Product[] = [
  {
    slug: "lavender-lemongrass",
    name: "Lavender Lemongrass",
    tagline: "Calming & Refreshing",
    price: 9.5,
    gradient: "from-purple-200 via-purple-100 to-lime-100",
    description:
      "A calming blend of lavender and bright lemongrass, crafted to soothe your senses and soften your skin.",
    ingredients: ["Lavender", "Lemongrass"],
  },
  {
    slug: "calming-herbal",
    name: "Calming Herbal",
    tagline: "Soothing & Grounding",
    price: 9.25,
    gradient: "from-emerald-200 via-emerald-100 to-lime-50",
    description:
      "A grounding herbal bar with rosemary, mint, and green clay to soothe the skin and calm the mind.",
    ingredients: ["Rosemary", "Mint", "Green Clay"],
  },
  {
    slug: "charcoal-cleanse",
    name: "Charcoal Cleanse",
    tagline: "Detoxifying & Purifying",
    price: 9.25,
    gradient: "from-neutral-800 via-neutral-700 to-neutral-600",
    description:
      "A deep-cleansing bar with activated charcoal, tea tree, and eucalyptus to purify and refresh.",
    ingredients: ["Activated Charcoal", "Tea Tree", "Eucalyptus"],
  },
  {
    slug: "turmeric-glow",
    name: "Turmeric Glow",
    tagline: "Brightening & Radiant",
    price: 9.25,
    gradient: "from-amber-300 via-orange-200 to-yellow-100",
    description:
      "A brightening bar infused with turmeric, ginger, and orange peel for naturally radiant-looking skin.",
    ingredients: ["Turmeric", "Ginger", "Orange Peel"],
  },
  {
    slug: "oat-honey",
    name: "Oat & Honey",
    tagline: "Nourishing & Gentle",
    price: 9.0,
    gradient: "from-amber-100 via-yellow-50 to-orange-50",
    description:
      "A gentle, nourishing bar with oats and honey to soften and comfort sensitive skin.",
    ingredients: ["Oats", "Honey"],
  },
  {
    slug: "eucalyptus-mint",
    name: "Eucalyptus Mint",
    tagline: "Cooling & Invigorating",
    price: 9.25,
    gradient: "from-teal-200 via-emerald-100 to-cyan-50",
    description:
      "A cooling, invigorating bar with eucalyptus and mint to awaken the senses.",
    ingredients: ["Eucalyptus", "Mint"],
  },
  {
    slug: "rose-clay",
    name: "Rose Clay",
    tagline: "Softening & Balancing",
    price: 9.25,
    gradient: "from-rose-200 via-pink-100 to-rose-50",
    description:
      "A softening bar with rose and pink clay to balance and gently polish the skin.",
    ingredients: ["Rose", "Pink Clay"],
  },
  {
    slug: "healing-herb-blend",
    name: "Healing Herb Blend",
    tagline: "Restorative & Soothing",
    price: 9.25,
    gradient: "from-lime-200 via-green-100 to-emerald-50",
    description:
      "A restorative blend of healing herbs, crafted to soothe and comfort the skin.",
    ingredients: ["Calendula", "Chamomile", "Rosemary"],
  },
];
