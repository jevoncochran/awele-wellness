import type { Metadata } from "next";
import ComingSoon from "@/components/shared/ComingSoon";

export const metadata: Metadata = {
  title: "About | Awele Wellness",
  description: "Learn the story behind Awele Wellness. Page coming soon.",
};

export default function AboutPage() {
  return (
    <ComingSoon
      title="About Us"
      description="Our story is still being written. Check back soon to learn more about our roots in Oakland and our commitment to handcrafted, natural wellness."
    />
  );
}
