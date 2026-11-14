import { logout } from "@/app/admin/actions";
import StockForm, { type StockRow } from "@/app/admin/StockForm";
import { requireAdmin } from "@/lib/admin-auth";
import { getInventory, type Inventory } from "@/lib/inventory";
import { products } from "@/lib/products";

export default async function AdminPage() {
  await requireAdmin();

  let inventory: Inventory | null = null;
  try {
    inventory = await getInventory();
  } catch (err) {
    console.error("[admin] Could not load stock:", err);
  }

  const rows: StockRow[] = inventory
    ? products.map((product) => ({
        slug: product.slug,
        name: product.name,
        image: product.image,
        gradient: product.gradient,
        quantity: inventory[product.slug].quantity,
      }))
    : [];

  return (
    <main className="flex flex-1 flex-col bg-cream px-6 pt-12 lg:px-8">
      <div className="mx-auto w-full max-w-4xl">
        <div className="flex items-center justify-between gap-4">
          <h1 className="font-serif text-3xl text-ink">Stock management</h1>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-full border border-brand-700/30 px-5 py-2 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-100"
            >
              Log out
            </button>
          </form>
        </div>

        <div className="mt-8">
          {inventory ? (
            <StockForm rows={rows} />
          ) : (
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <p className="font-medium text-red-700">
                Couldn&apos;t load stock from the database.
              </p>
              <p className="mt-2 text-sm text-ink-muted">
                Nothing is shown so you can&apos;t accidentally save over the
                real numbers. Refresh the page in a minute; if it keeps
                happening, the stock database connection needs attention.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
