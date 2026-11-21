import Link from "next/link";
import AdminHeader from "@/app/admin/AdminHeader";
import AddSoapForm from "@/app/admin/products/new/AddSoapForm";
import { requireAdmin } from "@/lib/admin-auth";
import { changeLinkClassName } from "@/components/checkout/formStyles";

export default async function NewSoapPage() {
  await requireAdmin();

  return (
    <main className="flex flex-1 flex-col bg-cream px-6 pt-12 pb-16 lg:px-8">
      <div className="mx-auto w-full max-w-2xl">
        <AdminHeader title="Add a soap" />
        <p className="mt-3">
          <Link href="/admin" className={changeLinkClassName}>
            &larr; Back to all soaps
          </Link>
        </p>
        <AddSoapForm />
      </div>
    </main>
  );
}
