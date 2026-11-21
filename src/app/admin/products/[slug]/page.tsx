import Link from "next/link";
import { notFound } from "next/navigation";
import AdminHeader from "@/components/admin/AdminHeader";
import SoapForm from "@/components/admin/SoapForm";
import { changeLinkClassName } from "@/components/checkout/formStyles";
import { requireAdmin } from "@/lib/admin-auth";
import { findProduct, getCatalogFresh, type CatalogProduct } from "@/lib/catalog";

export default async function EditSoapPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireAdmin();
  const { slug } = await params;

  let catalog: CatalogProduct[] | null = null;
  try {
    catalog = await getCatalogFresh();
  } catch (err) {
    console.error("[admin] Could not load the soap to edit:", err);
  }

  const soap = catalog ? findProduct(catalog, slug) : undefined;
  if (catalog && !soap) notFound();

  return (
    <main className="flex flex-1 flex-col bg-cream px-6 pt-12 pb-16 lg:px-8">
      <div className="mx-auto w-full max-w-2xl">
        <AdminHeader title="Edit soap" />
        <p className="mt-3">
          <Link href="/admin" className={changeLinkClassName}>
            &larr; Back to all soaps
          </Link>
        </p>
        {soap ? (
          <SoapForm
            soap={{
              slug: soap.slug,
              name: soap.name,
              tagline: soap.tagline,
              description: soap.description,
              ingredients: soap.ingredients,
              image: soap.image,
            }}
          />
        ) : (
          <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
            <p className="font-medium text-red-700">Couldn&apos;t load this soap.</p>
            <p className="mt-2 text-sm text-ink-muted">
              Refresh the page in a minute; if it keeps happening, the database
              connection needs attention.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
