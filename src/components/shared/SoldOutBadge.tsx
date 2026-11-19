// Pinned to the top-left of a product image (the parent must be `relative`).
export default function SoldOutBadge({
  size = "sm",
}: {
  size?: "sm" | "lg";
}) {
  return (
    <span
      className={`absolute z-10 rounded-full bg-ink font-semibold tracking-wide text-cream uppercase shadow-md ${
        size === "lg"
          ? "top-5 left-5 px-4 py-1.5 text-sm"
          : "top-3 left-3 px-3 py-1 text-xs"
      }`}
    >
      Sold Out
    </span>
  );
}
