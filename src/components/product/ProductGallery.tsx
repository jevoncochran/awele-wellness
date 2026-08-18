import Image from "next/image";
import { LeafIcon } from "@/components/icons";
import type { Product } from "@/lib/products";

export default function ProductGallery({ product }: { product: Product }) {
  if (product.image) {
    return (
      <div className="relative aspect-[4/5] overflow-hidden rounded-3xl shadow-xl shadow-brand-900/10">
        <Image
          src={product.image}
          alt={`${product.name} bar soap`}
          fill
          priority
          sizes="(min-width: 1024px) 40vw, 100vw"
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br p-10 shadow-xl shadow-brand-900/10 ${product.gradient}`}
    >
      <div className="flex flex-col items-center gap-2 rounded-xl bg-cream/95 px-6 py-5 text-center shadow-md ring-1 ring-black/5">
        <LeafIcon className="size-6 text-brand-700" />
        <span className="font-serif text-base font-semibold tracking-wide text-ink">
          Awele Wellness
        </span>
        <span className="text-[10px] font-medium tracking-widest text-ink-muted uppercase">
          Natural &amp; Medicinal Bar Soaps
        </span>
      </div>
    </div>
  );
}
