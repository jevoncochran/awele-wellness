import type { Metadata } from "next";
import { Suspense } from "react";
import CheckoutSuccess from "@/components/checkout/CheckoutSuccess";

export const metadata: Metadata = {
  title: "Order Confirmation | Awele Wellness",
  description: "Your Awele Wellness order confirmation.",
};

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutSuccess />
    </Suspense>
  );
}
