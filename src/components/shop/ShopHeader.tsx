import { LeafIcon } from "@/components/icons";

export default function ShopHeader() {
  return (
    <div className="relative overflow-hidden bg-cream-soft">
      <LeafIcon
        className="pointer-events-none absolute top-1/2 right-0 size-72 -translate-y-1/2 translate-x-1/4 text-brand-700/10"
        aria-hidden="true"
      />
      <div className="relative mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-20">
        <h1 className="font-serif text-4xl text-brand-800 sm:text-5xl">
          Shop Our Soaps
        </h1>
        <p className="mt-4 text-lg text-ink-muted">
          Handcrafted natural soaps made with love in Oakland, California.
        </p>
      </div>
    </div>
  );
}
