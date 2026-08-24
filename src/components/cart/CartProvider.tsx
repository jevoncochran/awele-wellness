"use client";

import { useSyncExternalStore } from "react";
import { products, type Product } from "@/lib/products";

export type CartItem = {
  slug: string;
  quantity: number;
};

export type CartLine = {
  item: CartItem;
  product: Product;
};

const STORAGE_KEY = "awele-cart";
export const MAX_QUANTITY_PER_ITEM = 20;

const EMPTY_CART: CartItem[] = [];

let cartItems: CartItem[] = EMPTY_CART;
let hasLoadedFromStorage = false;
const listeners = new Set<() => void>();

function loadFromStorage(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

function ensureLoaded() {
  if (hasLoadedFromStorage) return;
  cartItems = loadFromStorage();
  hasLoadedFromStorage = true;
}

function emitChange() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cartItems));
  } catch {
    // ignore write failures (e.g. storage disabled)
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): CartItem[] {
  ensureLoaded();
  return cartItems;
}

function getServerSnapshot(): CartItem[] {
  return EMPTY_CART;
}

export function addItem(slug: string, quantity: number) {
  ensureLoaded();
  const existing = cartItems.find((item) => item.slug === slug);
  cartItems = existing
    ? cartItems.map((item) =>
        item.slug === slug
          ? {
              ...item,
              quantity: Math.min(
                MAX_QUANTITY_PER_ITEM,
                item.quantity + quantity,
              ),
            }
          : item,
      )
    : [...cartItems, { slug, quantity: Math.min(MAX_QUANTITY_PER_ITEM, quantity) }];
  emitChange();
}

export function removeItem(slug: string) {
  ensureLoaded();
  cartItems = cartItems.filter((item) => item.slug !== slug);
  emitChange();
}

export function updateQuantity(slug: string, quantity: number) {
  ensureLoaded();
  if (quantity <= 0) {
    removeItem(slug);
    return;
  }
  cartItems = cartItems.map((item) =>
    item.slug === slug
      ? { ...item, quantity: Math.min(MAX_QUANTITY_PER_ITEM, quantity) }
      : item,
  );
  emitChange();
}

export function clearCart() {
  ensureLoaded();
  cartItems = EMPTY_CART;
  emitChange();
}

export function resolveCartLines(items: CartItem[]): CartLine[] {
  return items
    .map((item) => {
      const product = products.find((p) => p.slug === item.slug);
      return product ? { item, product } : null;
    })
    .filter((line): line is CartLine => line !== null);
}

export function useCart() {
  const items = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  return { items, itemCount, addItem, removeItem, updateQuantity, clearCart };
}
