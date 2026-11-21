import AdminHeader from "@/app/admin/AdminHeader";
import SoapList, { type StockRow } from "@/app/admin/SoapList";
import { requireAdmin } from "@/lib/admin-auth";
import { getCatalogFresh, type CatalogProduct } from "@/lib/catalog";
import { getInventory, type Inventory } from "@/lib/inventory";

export default async function AdminPage() {
  await requireAdmin();

  let catalog: CatalogProduct[] = [];
  let inventory: Inventory | null = null;
  try {
    catalog = await getCatalogFresh();
    inventory = await getInventory(catalog);
  } catch (err) {
    console.error("[admin] Could not load soaps:", err);
  }

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

        <div className="mt-8">
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
