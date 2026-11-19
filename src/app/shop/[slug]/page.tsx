import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductGallery from "@/components/product/ProductGallery";
import ProductDetails from "@/components/product/ProductDetails";
import { findProduct, getCatalog } from "@/lib/catalog";
import { getStorefrontInventory } from "@/lib/inventory";
import { SEED_PRODUCTS } from "@/lib/products";

// Stock and soap changes are pushed to this page the moment the owner saves
// them in the admin; this is the fallback if that ever gets missed.
export const revalidate = 60;

// Only the original soaps are prebuilt. Soaps added later are built the first
// time someone visits them, then kept fresh like the rest.
export function generateStaticParams() {
  return SEED_PRODUCTS.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/shop/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = findProduct(await getCatalog(), slug);

  if (!product || product.hidden) return {};

  return {
    title: `${product.name} | Awele Wellness`,
    description: product.description,
  };
}

export default async function ProductPage({
  params,
}: PageProps<"/shop/[slug]">) {
  const { slug } = await params;
  const product = findProduct(await getCatalog(), slug);

  // A hidden soap has no page.
  if (!product || product.hidden) notFound();

  const inventory = await getStorefrontInventory();
  const soldOut = inventory[product.slug]?.soldOut ?? false;
  const available = inventory[product.slug]?.quantity ?? null;

  return (
    <main className="flex flex-1 flex-col">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-6 py-12 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-20">
        <ProductGallery product={product} soldOut={soldOut} />
        <ProductDetails
          product={product}
          soldOut={soldOut}
          available={available}
        />
      </div>
    </main>
  );
}
