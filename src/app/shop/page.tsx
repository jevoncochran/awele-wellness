import type { Metadata } from "next";
import ShopHeader from "@/components/shop/ShopHeader";
import ProductGrid from "@/components/shop/ProductGrid";
import { getCatalog, visibleProducts } from "@/lib/catalog";
import { getStorefrontInventory } from "@/lib/inventory";

export const metadata: Metadata = {
  title: "Shop | Awele Wellness",
  description:
    "Shop handcrafted natural and medicinal bar soaps made with love in Oakland, California.",
};

// Stock changes are pushed to this page the moment the owner saves them in the
// admin; this is the fallback if that ever gets missed.
export const revalidate = 60;

export default async function ShopPage() {
  const [catalog, inventory] = await Promise.all([
    getCatalog(),
    getStorefrontInventory(),
  ]);

  return (
    <main className="flex flex-1 flex-col">
      <ShopHeader />
      <ProductGrid products={visibleProducts(catalog)} inventory={inventory} />
    </main>
  );
}
