import type { Metadata } from "next";

// Keeps the private admin area out of search results. This only affects
// crawlers; access is controlled by the admin session.
export const metadata: Metadata = {
  title: "Admin | Awele Wellness",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return children;
}
