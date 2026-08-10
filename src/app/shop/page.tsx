import type { Metadata } from "next";
import ShopHeader from "@/components/shop/ShopHeader";
import ProductGrid from "@/components/shop/ProductGrid";

export const metadata: Metadata = {
  title: "Shop | Awele Wellness",
  description:
    "Shop handcrafted natural and medicinal bar soaps made with love in Oakland, California.",
};

export default function ShopPage() {
  return (
    <main className="flex flex-1 flex-col">
      <ShopHeader />
      <ProductGrid />
    </main>
  );
}
