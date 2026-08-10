import type { Metadata } from "next";
import ComingSoon from "@/components/shared/ComingSoon";

export const metadata: Metadata = {
  title: "FAQ | Awele Wellness",
  description: "Frequently asked questions. Page coming soon.",
};

export default function FaqPage() {
  return (
    <ComingSoon
      title="FAQ"
      description="We're putting together answers to our most common questions. Check back soon."
    />
  );
}
