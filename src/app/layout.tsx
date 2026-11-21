import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import {
  CatalogProvider,
  type CartProduct,
} from "@/components/cart/CatalogProvider";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import BundleDealsBanner from "@/components/shared/BundleDealsBanner";
import { getCatalog } from "@/lib/catalog";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Awele Wellness | Oakland-Crafted Bar Soaps",
  description:
    "Handcrafted medicinal bar soaps made in Oakland, California with natural ingredients, artisanal care, and a deep commitment to our local community.",
};

// The cart shows soaps from the catalog, which this layout reads. Soap changes
// in the admin are pushed to pages right away; this is the fallback if that is
// ever missed.
export const revalidate = 60;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const catalog = await getCatalog();
  const cartProducts: CartProduct[] = catalog.map((product) => ({
    slug: product.slug,
    name: product.name,
    tagline: product.tagline,
    price: product.price,
    image: product.image,
    gradient: product.gradient,
    hidden: product.hidden,
  }));

  return (
    <html
      lang="en"
      className={`${inter.variable} ${playfairDisplay.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-cream text-ink font-sans">
        <BundleDealsBanner variant="bar" />
        <CatalogProvider products={cartProducts}>
          <Navbar />
          {children}
          <Footer />
        </CatalogProvider>
      </body>
    </html>
  );
}
