import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import { BUNDLE_DEALS } from "@/lib/pricing";

function formatDeal(bars: number, cents: number) {
  const dollars = cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
  return `${bars} for $${dollars}`;
}

export default function BundleDealsBanner({
  variant,
  className = "",
}: {
  variant: "bar" | "compact";
  className?: string;
}) {
  const deals = BUNDLE_DEALS.map(({ bars, cents }) => formatDeal(bars, cents));

  // Site-wide strip across the very top of the page.
  if (variant === "bar") {
    return (
      <div
        className={`bg-brand-800 px-4 py-2.5 text-center text-sm text-cream ${className}`}
      >
        <span className="font-semibold">Bundle &amp; Save:</span>{" "}
        {deals.join(" · ")}
        <span className="text-cream/80"> — mix any soaps</span>
        <Link
          href="/shop"
          className="ml-3 inline-flex items-center gap-1 font-semibold whitespace-nowrap underline underline-offset-4 transition-colors hover:text-brand-200"
        >
          Shop now
          <ArrowRightIcon className="size-3.5" />
        </Link>
      </div>
    );
  }

  return (
    <p
      className={`rounded-xl bg-brand-100 px-3 py-2 text-sm text-brand-800 ${className}`}
    >
      <span className="font-semibold">Bundle &amp; save:</span>{" "}
      {deals.join(" · ")}
      <span className="text-ink-muted"> — mix any soaps</span>
    </p>
  );
}
