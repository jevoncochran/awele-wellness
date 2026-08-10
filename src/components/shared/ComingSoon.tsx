import Link from "next/link";
import { LeafIcon } from "@/components/icons";

export default function ComingSoon({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-cream-soft px-6 py-24 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-brand-100 text-brand-700">
        <LeafIcon className="size-6" />
      </span>
      <p className="mt-6 text-xs font-semibold tracking-widest text-brand-700 uppercase">
        Coming Soon
      </p>
      <h1 className="mt-3 font-serif text-4xl text-ink sm:text-5xl">
        {title}
      </h1>
      <p className="mt-4 max-w-md text-ink-muted">{description}</p>
      <Link
        href="/shop"
        className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand-700 px-6 py-3 text-sm font-semibold text-cream transition-colors hover:bg-brand-800"
      >
        Shop the Collection
        <LeafIcon className="size-4" />
      </Link>
    </main>
  );
}
