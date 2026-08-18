import Image from "next/image";
import Link from "next/link";
import { LeafIcon } from "@/components/icons";
import type { Product } from "@/lib/products";

export default function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/shop/${product.slug}`}
      className="block overflow-hidden rounded-2xl border border-brand-700/10 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      {product.image ? (
        <div className="relative aspect-square">
          <Image
            src={product.image}
            alt={`${product.name} bar soap`}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
      ) : (
        <div
          className={`relative flex aspect-square items-center justify-center bg-gradient-to-br p-8 ${product.gradient}`}
        >
          <div className="flex flex-col items-center gap-1 rounded-lg bg-cream/95 px-4 py-3 text-center shadow-md ring-1 ring-black/5">
            <LeafIcon className="size-4 text-brand-700" />
            <span className="font-serif text-xs font-semibold tracking-wide text-ink">
              Awele Wellness
            </span>
          </div>
        </div>
      )}

      <div className="p-5">
        <h3 className="font-serif text-lg text-ink">{product.name}</h3>
        <p className="mt-1 text-sm text-ink-muted">{product.tagline}</p>
        <p className="mt-3 font-semibold text-ink">
          ${product.price.toFixed(2)}
        </p>
      </div>
    </Link>
  );
}
