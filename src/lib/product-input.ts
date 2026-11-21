// What the owner types when adding or editing a soap: reading it from the
// form, checking it, and turning the name into a web address (slug). Plain
// functions, shared by the create and edit actions.
import { isOurBlobUrl } from "@/lib/blob-host";
import { GRADIENT_PALETTE } from "@/lib/products";

export const LIMITS = {
  nameMin: 2,
  nameMax: 60,
  taglineMin: 2,
  taglineMax: 80,
  descriptionMin: 10,
  descriptionMax: 1000,
  ingredientsMax: 30,
  ingredientMax: 60,
} as const;

export type ProductInput = {
  name: string;
  tagline: string;
  description: string;
  ingredients: string[];
  // Our own photo address (or the soap's existing photo); undefined = none.
  image?: string;
};

export type ProductField = "name" | "tagline" | "description" | "ingredients" | "image" | "stock";
export type ProductFieldErrors = Partial<Record<ProductField, string>>;

// One line of tidy text: control characters and runs of spaces/newlines
// collapse to a single space.
function tidy(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") return "";
  return value
    .normalize("NFC")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// "Goat Milk, Oatmeal ,  , oatmeal" -> ["Goat Milk", "Oatmeal"]
function parseIngredients(value: FormDataEntryValue | null): string[] {
  if (typeof value !== "string") return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const part of value.split(/[,\n]/)) {
    const item = tidy(part);
    const key = item.toLowerCase();
    if (!item || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

// Lowercase letters, digits and single dashes: "Cherry & Almond!" -> "cherry-and-almond".
export function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
    .replace(/-+$/, "");
}

// The first free address: "peppermint", then "peppermint-2", "peppermint-3"...
export function uniqueSlug(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base.slice(0, 46)}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
}

// New soaps rotate through the palette so neighbours look different. Only
// matters for the card background when a soap has no photo.
export function pickGradient(existingCount: number): string {
  return GRADIENT_PALETTE[existingCount % GRADIENT_PALETTE.length];
}

// Reads and checks the soap fields of the form. `currentImage` is the soap's
// existing photo when editing (it is allowed to stay as it is); any other
// photo must be one we uploaded ourselves.
export function parseProductForm(
  formData: FormData,
  currentImage?: string,
): { ok: true; value: ProductInput } | { ok: false; errors: ProductFieldErrors } {
  const errors: ProductFieldErrors = {};

  const name = tidy(formData.get("name"));
  if (name.length < LIMITS.nameMin || name.length > LIMITS.nameMax) {
    errors.name = `Enter a name between ${LIMITS.nameMin} and ${LIMITS.nameMax} characters.`;
  } else if (!slugify(name)) {
    errors.name = "The name needs at least one letter or number.";
  }

  const tagline = tidy(formData.get("tagline"));
  if (tagline.length < LIMITS.taglineMin || tagline.length > LIMITS.taglineMax) {
    errors.tagline = `Enter a short tagline of ${LIMITS.taglineMin} to ${LIMITS.taglineMax} characters.`;
  }

  const description = tidy(formData.get("description"));
  if (description.length < LIMITS.descriptionMin || description.length > LIMITS.descriptionMax) {
    errors.description = `Enter a description between ${LIMITS.descriptionMin} and ${LIMITS.descriptionMax} characters.`;
  }

  const ingredients = parseIngredients(formData.get("ingredients"));
  if (ingredients.length === 0) {
    errors.ingredients = "List at least one ingredient, separated by commas.";
  } else if (ingredients.length > LIMITS.ingredientsMax) {
    errors.ingredients = `That's too many ingredients (the most is ${LIMITS.ingredientsMax}).`;
  } else if (ingredients.some((item) => item.length > LIMITS.ingredientMax)) {
    errors.ingredients = `Each ingredient must be ${LIMITS.ingredientMax} characters or fewer. Check the commas.`;
  }

  const rawImage = formData.get("image");
  const image = typeof rawImage === "string" ? rawImage.trim() : "";
  if (image && image !== currentImage && !isOurBlobUrl(image)) {
    errors.image = "That photo wasn't uploaded here. Please choose it again.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: { name, tagline, description, ingredients, image: image || undefined },
  };
}
