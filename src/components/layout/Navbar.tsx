"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  FacebookIcon,
  InstagramIcon,
  MenuIcon,
  XIcon,
} from "@/components/icons";

const navLinks = [
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-brand-700/10 bg-cream/90 backdrop-blur">
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

        <div className="hidden items-center gap-2 md:flex">
          <a
            href="#"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="flex size-9 items-center justify-center rounded-full text-ink transition-colors hover:bg-brand-100 hover:text-brand-700"
          >
            <InstagramIcon className="size-5" />
          </a>
          <a
            href="#"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook"
            className="flex size-9 items-center justify-center rounded-full text-ink transition-colors hover:bg-brand-100 hover:text-brand-700"
          >
            <FacebookIcon className="size-5" />
          </a>
        </div>

        <button
          type="button"
          onClick={() => setIsMenuOpen((open) => !open)}
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

      {isMenuOpen && (
        <nav className="border-t border-brand-700/10 bg-cream md:hidden">
          <div className="flex flex-col gap-1 px-6 py-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMenuOpen(false)}
                className="rounded-lg px-2 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-brand-100 hover:text-brand-700"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/shop"
              onClick={() => setIsMenuOpen(false)}
              className="mt-2 rounded-full bg-brand-700 px-5 py-2.5 text-center text-sm font-semibold text-cream transition-colors hover:bg-brand-800"
            >
              Shop Soaps
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
