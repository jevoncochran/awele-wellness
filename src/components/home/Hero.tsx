import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon, HeartIcon, LeafIcon } from "@/components/icons";

const highlights = [
  { icon: LeafIcon, label: "Natural Ingredients" },
  { icon: HeartIcon, label: "Small Batches" },
  { icon: LeafIcon, label: "Made in Oakland" },
];

export default function Hero() {
  return (
    <section className="overflow-hidden bg-gradient-to-b from-cream-soft to-cream">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-24">
        <div>
          <h1 className="font-serif text-4xl leading-tight text-ink sm:text-5xl lg:text-6xl">
            Oakland-Crafted Wellness, One Bar at a Time
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-muted">
            Handcrafted medicinal bar soaps made in Oakland, California with
            natural ingredients, artisanal care, and a deep commitment to our
            local community.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 rounded-full bg-brand-700 px-6 py-3.5 text-sm font-semibold text-cream transition-colors hover:bg-brand-800"
            >
              Shop the Collection
              <LeafIcon className="size-4" />
            </Link>
            <Link
              href="/about"
              className="inline-flex items-center gap-2 text-sm font-semibold text-ink underline decoration-brand-700/40 underline-offset-4 transition-colors hover:text-brand-700"
            >
              Our Story
              <ArrowRightIcon className="size-4" />
            </Link>
          </div>

          <ul className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-ink-muted">
            {highlights.map(({ icon: Icon, label }, index) => (
              <li key={label} className="flex items-center gap-3">
                {index > 0 && (
                  <span
                    className="size-1 rounded-full bg-ink-muted/50"
                    aria-hidden="true"
                  />
                )}
                <span className="flex items-center gap-2">
                  <Icon className="size-4 text-brand-700" />
                  {label}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative">
          <div
            className="absolute inset-[-10%] rounded-full bg-brand-200/40 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative aspect-[4/5] sm:aspect-[5/4] lg:aspect-[4/5] [mask-image:radial-gradient(ellipse_58%_58%_at_50%_50%,black_35%,transparent_100%)] [-webkit-mask-image:radial-gradient(ellipse_64%_68%_at_60%_50%,black_85%,transparent_97%)]">
            <Image
              src="/assets/images/home/awele_welleness_banner_img.jpg"
              alt="A bar of Awele Wellness Oat & Honey soap surrounded by honey, milk, and oats"
              fill
              priority
              sizes="(min-width: 1024px) 40vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
