import type { Metadata } from "next";
import ComingSoon from "@/components/shared/ComingSoon";

export const metadata: Metadata = {
  title: "Contact | Awele Wellness",
  description: "Get in touch with Awele Wellness. Page coming soon.",
};

export default function ContactPage() {
  return (
    <ComingSoon
      title="Contact"
      description="Our contact page is on its way. In the meantime, say hello on Instagram or Facebook."
    />
  );
}
