import { logout } from "@/app/admin/actions";

// Title and Log out, shared by the admin pages.
export default function AdminHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h1 className="font-serif text-3xl text-ink">{title}</h1>
      <form action={logout}>
        <button
          type="submit"
          className="rounded-full border border-brand-700/30 px-5 py-2 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-100"
        >
          Log out
        </button>
      </form>
    </div>
  );
}
