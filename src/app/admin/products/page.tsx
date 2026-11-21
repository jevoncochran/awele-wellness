import { redirect } from "next/navigation";

// Soaps and stock now share one page; keep old bookmarks working.
export default function AdminProductsPage() {
  redirect("/admin");
}
