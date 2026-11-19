"use client";

import { createContext, useContext, type ReactNode } from "react";

// What the cart and checkout need to show a soap. The root layout reads the
// catalog on the server and hands this down, so the cart can show names and
// photos for any soap the owner has added. Hidden soaps are included so a cart
// that still holds one can show it (flagged) instead of silently dropping it.
export type CartProduct = {
  slug: string;
  name: string;
  tagline: string;
  price: number;
  image?: string;
  gradient: string;
  hidden: boolean;
};

const CatalogContext = createContext<CartProduct[]>([]);

export function CatalogProvider({
  products,
  children,
}: {
  products: CartProduct[];
  children: ReactNode;
}) {
  return (
    <CatalogContext.Provider value={products}>{children}</CatalogContext.Provider>
  );
}

export function useCatalog(): CartProduct[] {
  return useContext(CatalogContext);
}
