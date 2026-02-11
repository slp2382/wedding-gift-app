// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CartProvider } from "./providers/CartProvider";
import { GoogleAnalytics } from "@next/third-parties/google";

export const metadata: Metadata = {
  title: "Givio Cards",
  description: "Wedding gift QR cards",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-50 text-zinc-900">
        <CartProvider>{children}</CartProvider>
        <GoogleAnalytics gaId="G-863FV6BMP2" />
      </body>
    </html>
  );
}
