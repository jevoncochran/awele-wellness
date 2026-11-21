import Link from "next/link";
import AdminHeader from "@/components/admin/AdminHeader";
import SoapList, { type StockRow } from "@/components/admin/SoapList";
import { requireAdmin } from "@/lib/admin-auth";
import { getCatalogFresh, type CatalogProduct } from "@/lib/catalog";
import { getInventory, type Inventory } from "@/lib/inventory";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ added?: string; saved?: string }>;
}) {
  await requireAdmin();
  const { added, saved } = await searchParams;

  let catalog: CatalogProduct[] = [];
  let inventory: Inventory | null = null;
  try {
    catalog = await getCatalogFresh();
    inventory = await getInventory(catalog);
  } catch (err) {
    console.error("[admin] Could not load soaps:", err);
  }

  // After "Add a soap": confirm using the soap's stored name, never the raw
  // text from the address.
  const addedSoap = catalog.find((product) => product.slug === added);
  const savedSoap = catalog.find((product) => product.slug === saved);

  const rows: StockRow[] = inventory
    ? catalog.map((product) => ({
        slug: product.slug,
        name: product.name,
        image: product.image,
        gradient: product.gradient,
        quantity: inventory[product.slug].quantity,
        hidden: product.hidden,
      }))
    : [];

  return (
    <main className="flex flex-1 flex-col bg-cream px-6 pt-12 lg:px-8">
      <div className="mx-auto w-full max-w-4xl">
        <AdminHeader title="Soaps" />

        {addedSoap && (
          <p
            role="status"
            className="mt-6 rounded-xl bg-brand-100 px-5 py-3 text-sm font-medium text-brand-800"
          >
            {addedSoap.hidden
              ? `${addedSoap.name} was added, but it's hidden. Press "Show in shop" when you're ready.`
              : `${addedSoap.name} was added and is live in the shop.`}{" "}
            {!addedSoap.hidden && (
              <Link
                href={`/shop/${addedSoap.slug}`}
                className="underline decoration-brand-700/40 underline-offset-4"
              >
                View it
              </Link>
            )}
          </p>
        )}

        {savedSoap && !addedSoap && (
          <p
            role="status"
            className="mt-6 rounded-xl bg-brand-100 px-5 py-3 text-sm font-medium text-brand-800"
          >
            {savedSoap.name} was updated.{" "}
            {!savedSoap.hidden && (
              <Link
                href={`/shop/${savedSoap.slug}`}
                className="underline decoration-brand-700/40 underline-offset-4"
              >
                View it
              </Link>
            )}
          </p>
        )}

        <div className="mt-6 flex justify-end">
          <Link
            href="/admin/products/new"
            className="rounded-full bg-brand-700 px-6 py-2.5 text-sm font-semibold text-cream transition-colors hover:bg-brand-800"
          >
            + Add a soap
          </Link>
        </div>

        <div className="mt-4">
          {inventory ? (
            <SoapList rows={rows} />
          ) : (
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <p className="font-medium text-red-700">
                Couldn&apos;t load the soaps from the database.
              </p>
              <p className="mt-2 text-sm text-ink-muted">
                Nothing is shown so you can&apos;t accidentally save over the
                real numbers. Refresh the page in a minute; if it keeps
                happening, the database connection needs attention.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
