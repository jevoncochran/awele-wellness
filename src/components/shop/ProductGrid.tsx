import ProductCard from "@/components/shop/ProductCard";
import type { CatalogProduct } from "@/lib/catalog";
import type { Inventory } from "@/lib/inventory";

export default function ProductGrid({
  products,
  inventory,
}: {
  products: CatalogProduct[];
  inventory: Inventory;
}) {
  return (
    <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
      <div className="grid grid-cols-2 gap-4 sm:gap-8 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard
            key={product.slug}
            product={product}
            soldOut={inventory[product.slug]?.soldOut ?? false}
          />
        ))}
      </div>
    </div>
  );
}
