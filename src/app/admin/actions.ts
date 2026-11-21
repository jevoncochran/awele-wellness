"use server";

import { revalidatePath, updateTag } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  endAdminSession,
  passwordMatches,
  requireAdmin,
  startAdminSession,
} from "@/lib/admin-auth";
import {
  LOCKOUT_MINUTES,
  clearFailedLogins,
  isLoginLocked,
  recordFailedLogin,
} from "@/lib/admin-rate-limit";
import {
  INVENTORY_TAG,
  saveStock,
  validateStockQuantity,
} from "@/lib/inventory";
import {
  CATALOG_TAG,
  DuplicateProductError,
  addProduct,
  getCatalogFresh,
  setProductHidden,
  type CatalogProduct,
} from "@/lib/catalog";
import { parseProductForm, type ProductFieldErrors } from "@/lib/product-input";

export type LoginState = { error?: string };

export type ProductActionState = {
  status: "idle" | "saved" | "error";
  message?: string;
};

export type ProductFormState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: ProductFieldErrors;
};

export type SaveStockState = {
  status: "idle" | "saved" | "error";
  message?: string;
};

async function getClientIp(): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headerList.get("x-real-ip") || "unknown";
}

export async function login(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const ip = await getClientIp();

  if (await isLoginLocked(ip)) {
    return {
      error: `Too many incorrect attempts. Try again in ${LOCKOUT_MINUTES} minutes.`,
    };
  }

  const password = formData.get("password");
  if (typeof password !== "string" || !passwordMatches(password)) {
    await recordFailedLogin(ip);
    return { error: "Incorrect password." };
  }

  try {
    await startAdminSession();
  } catch (err) {
    console.error("[admin] Could not start session:", err);
    return { error: "Admin login isn't configured on the server." };
  }

  await clearFailedLogins(ip);
  redirect("/admin");
}

// Each row submits the quantity it had when the page loaded
// ("original-<slug>") next to the owner's edit ("quantity-<slug>"). Only rows
// that differ are written, so a stale page can't overwrite stock that changed
// meanwhile (e.g. a customer bought a soap) in rows the owner didn't touch.
// A blank quantity means "not tracked"; 0 means sold out.
export async function saveStockChanges(
  _previousState: SaveStockState,
  formData: FormData,
): Promise<SaveStockState> {
  await requireAdmin();

  let catalog: CatalogProduct[];
  try {
    catalog = await getCatalogFresh();
  } catch (err) {
    console.error("[admin] Could not read the catalog:", err);
    return {
      status: "error",
      message: "Couldn't reach the database. Nothing was saved.",
    };
  }

  const changes: { slug: string; name: string; quantity: number | null }[] = [];
  const problems: string[] = [];

  for (const product of catalog) {
    const quantityText = String(formData.get(`quantity-${product.slug}`) ?? "").trim();
    const original = String(formData.get(`original-${product.slug}`) ?? "");

    if (quantityText === original) continue;

    if (quantityText !== "" && !/^\d+$/.test(quantityText)) {
      problems.push(`${product.name}: quantity must be a whole number.`);
      continue;
    }
    const quantity = quantityText === "" ? null : Number(quantityText);
    const problem = validateStockQuantity(quantity);
    if (problem) {
      problems.push(`${product.name}: ${problem}`);
      continue;
    }
    changes.push({ slug: product.slug, name: product.name, quantity });
  }

  if (problems.length > 0) {
    return {
      status: "error",
      message: `Nothing was saved. ${problems.join(" ")}`,
    };
  }
  if (changes.length === 0) {
    return { status: "saved", message: "No changes to save." };
  }

  try {
    for (const { slug, quantity } of changes) {
      await saveStock(slug, quantity);
    }
    // Re-renders this page with the numbers that were just saved, and expires
    // the cached stock so the shop and product pages show them straight away.
    revalidatePath("/admin");
    updateTag(INVENTORY_TAG);
  } catch (err) {
    console.error("[admin] Could not save stock:", err);
    return {
      status: "error",
      message:
        "Couldn't reach the stock database. Some changes may not have saved — refresh the page to see what's current.",
    };
  }

  return {
    status: "saved",
    message: `Saved ${changes.length} change${changes.length === 1 ? "" : "s"}: ${changes.map((c) => c.name).join(", ")}.`,
  };
}

// Hides or shows one soap. Hidden soaps disappear from the shop, their product
// page goes away, and a cart still holding one is flagged at checkout.
export async function setProductVisibility(
  _previousState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  await requireAdmin();

  const slug = String(formData.get("slug") ?? "");
  const hidden = formData.get("hidden") === "true";

  try {
    const product = await setProductHidden(slug, hidden);
    // Expire the cached catalog so the shop and product pages change straight
    // away, and refresh the admin pages.
    updateTag(CATALOG_TAG);
    revalidatePath("/admin");
    return {
      status: "saved",
      message: hidden
        ? `${product.name} is now hidden from the shop.`
        : `${product.name} is visible in the shop again.`,
    };
  } catch (err) {
    console.error("[admin] Could not change visibility:", err);
    const unknown = err instanceof Error && /^Unknown product/.test(err.message);
    return {
      status: "error",
      message: unknown
        ? "That soap no longer exists. Refresh the page."
        : "Couldn't save that change. Please try again.",
    };
  }
}

// Adds a new soap from the "Add a soap" form. On success it goes back to the
// list with a confirmation; on a problem it returns the messages and nothing
// (or, if only the stock step failed, a hidden soap) is left behind.
export async function createProduct(
  _previousState: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  await requireAdmin();

  const parsed = parseProductForm(formData);
  const fieldErrors: ProductFieldErrors = parsed.ok ? {} : { ...parsed.errors };

  // Optional starting stock: blank = not tracked (sold without a limit).
  const stockText = String(formData.get("stock") ?? "").trim();
  let quantity: number | null = null;
  if (stockText !== "") {
    quantity = /^\d+$/.test(stockText) ? Number(stockText) : NaN;
    const problem = validateStockQuantity(quantity);
    if (problem) fieldErrors.stock = problem;
  }

  if (!parsed.ok || Object.keys(fieldErrors).length > 0) {
    return {
      status: "error",
      message: "Please fix the highlighted fields. Nothing was saved.",
      fieldErrors,
    };
  }

  // With a starting stock, the soap is created hidden and only shown once the
  // stock is saved, so a failure can never leave a limited soap on sale as
  // "unlimited".
  let product: CatalogProduct;
  try {
    product = await addProduct(parsed.value, { hidden: quantity !== null });
  } catch (err) {
    if (err instanceof DuplicateProductError) {
      return {
        status: "error",
        message: "Please fix the highlighted fields. Nothing was saved.",
        fieldErrors: { name: "A soap with that name already exists." },
      };
    }
    console.error("[admin] Could not add the soap:", err);
    return {
      status: "error",
      message: "Couldn't save the soap. Nothing was added. Please try again.",
    };
  }

  if (quantity !== null) {
    try {
      await saveStock(product.slug, quantity);
      await setProductHidden(product.slug, false);
      updateTag(INVENTORY_TAG);
    } catch (err) {
      console.error("[admin] Added a soap but could not finish setting its stock:", err);
      updateTag(CATALOG_TAG);
      revalidatePath("/admin");
      return {
        status: "error",
        message: `${product.name} was added but is hidden for now, because its stock couldn't be saved. Go back to the list, set its quantity, and press "Show in shop". Don't add it again.`,
      };
    }
  }

  updateTag(CATALOG_TAG);
  revalidatePath("/admin");
  redirect(`/admin?added=${encodeURIComponent(product.slug)}`);
}

export async function logout() {
  await endAdminSession();
  redirect("/admin/login");
}
