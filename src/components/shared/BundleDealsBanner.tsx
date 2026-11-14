import { LeafIcon } from "@/components/icons";
import { BUNDLE_DEALS } from "@/lib/pricing";

function formatDeal(bars: number, cents: number) {
  const dollars = cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
  return `${bars} for $${dollars}`;
}

export default function BundleDealsBanner({
  variant = "full",
  className = "",
}: {
  variant?: "full" | "compact";
  className?: string;
}) {
  const deals = BUNDLE_DEALS.map(({ bars, cents }) => formatDeal(bars, cents));

  if (variant === "compact") {
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

  return (
    <div
      className={`inline-flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-brand-700/15 bg-brand-100/60 px-4 py-3 ${className}`}
    >
      <span className="flex items-center gap-2 text-xs font-semibold tracking-widest text-brand-700 uppercase">
        <LeafIcon className="size-4" />
        Bundle &amp; Save
      </span>
      <ul className="flex flex-wrap items-center gap-2">
        {deals.map((deal) => (
          <li
            key={deal}
            className="rounded-full bg-brand-700 px-3 py-1 text-sm font-semibold text-cream"
          >
            {deal}
          </li>
        ))}
      </ul>
      <span className="text-sm text-ink-muted">Mix any soaps</span>
    </div>
  );
}
