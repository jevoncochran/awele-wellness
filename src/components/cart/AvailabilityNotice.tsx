import { describeUnavailable, type UnavailableItem } from "@/lib/purchase-limits";

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Shown in the cart drawer and on the checkout page when something in the cart
// can't be bought, with one button that fixes it.
export default function AvailabilityNotice({
  issues,
  onFix,
  className = "",
}: {
  issues: UnavailableItem[];
  onFix: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={`rounded-xl border border-red-200 bg-red-50 p-4 ${className}`}
    >
      <p className="text-sm font-semibold text-red-800">
        Some items in your cart aren&apos;t available
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-800">
        {issues.map((issue) => (
          <li key={issue.slug}>{capitalize(describeUnavailable(issue))}</li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onFix}
        className="mt-3 w-full rounded-full bg-red-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-800"
      >
        Update my cart
      </button>
    </div>
  );
}
