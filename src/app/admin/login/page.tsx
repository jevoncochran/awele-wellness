import { redirect } from "next/navigation";
import LoginForm from "@/app/admin/login/LoginForm";
import { isAdmin } from "@/lib/admin-auth";

export default async function AdminLoginPage() {
  if (await isAdmin()) redirect("/admin");

  return (
    <main className="flex flex-1 items-center justify-center bg-cream px-6 py-16">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="font-serif text-2xl text-ink">Admin login</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Enter the admin password to manage stock.
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
