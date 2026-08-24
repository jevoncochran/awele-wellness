import type { Metadata } from "next";
import CheckoutView from "@/components/checkout/CheckoutView";

export const metadata: Metadata = {
  title: "Checkout | Awele Wellness",
  description: "Complete your Awele Wellness order.",
};

export default function CheckoutPage() {
  return <CheckoutView />;
}
