"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import CartDrawer from "@/components/cart/CartDrawer";
import { useCart } from "@/components/cart/CartProvider";
import { MenuIcon, ShoppingBagIcon, XIcon } from "@/components/icons";

const navLinks = [
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  // The announcement bar sits above the header until the page is scrolled, so
  // the mobile menu measures where the header ends instead of assuming a height.
  const [menuTop, setMenuTop] = useState(0);
  const headerRef = useRef<HTMLElement>(null);
  const { itemCount } = useCart();

  useEffect(() => {
    if (!isMenuOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [isMenuOpen]);

  return (
    <>
      <header
        ref={headerRef}
        className="sticky top-0 z-50 border-b border-brand-700/10 bg-cream/90 backdrop-blur"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3 lg:px-8">
          <Link href="/" className="flex items-center">
            <Image
              src="/assets/navbar/awele-logo-trimmed.png"
              alt="Awele Wellness"
              width={531}
              height={560}
              priority
              className="h-20 w-auto"
            />
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-ink transition-colors hover:text-brand-700"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <button
            type="button"
            onClick={() => {
              setIsMenuOpen(false);
              setIsCartOpen(true);
            }}
            aria-label={`Cart, ${itemCount} item${itemCount === 1 ? "" : "s"}`}
            className="relative flex size-9 items-center justify-center rounded-full text-ink transition-colors hover:bg-brand-100 hover:text-brand-700"
          >
            <ShoppingBagIcon className="size-5" />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-brand-700 text-[10px] font-bold text-cream">
                {itemCount > 9 ? "9+" : itemCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setIsCartOpen(false);
              setMenuTop(headerRef.current?.getBoundingClientRect().bottom ?? 0);
              setIsMenuOpen((open) => !open);
            }}
            className="flex size-10 items-center justify-center rounded-full text-ink md:hidden"
            aria-expanded={isMenuOpen}
            aria-label="Toggle navigation menu"
          >
            {isMenuOpen ? (
              <XIcon className="size-6" />
            ) : (
              <MenuIcon className="size-6" />
            )}
          </button>
        </div>
      </header>

      {isMenuOpen && (
        <div
          className="fixed inset-x-0 bottom-0 z-40 overflow-y-auto bg-cream pt-2 md:hidden"
          style={{ top: menuTop }}
        >
          <nav className="flex flex-col gap-1 px-6 py-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMenuOpen(false)}
                className="rounded-lg px-2 py-3 text-base font-medium text-ink transition-colors hover:bg-brand-100 hover:text-brand-700"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}

      <CartDrawer open={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}
