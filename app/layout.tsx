// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CartProvider } from "./providers/CartProvider";

// Keep or adjust this to whatever you already had
export const metadata: Metadata = {
  title: "GiftLink",
  description: "Wedding gift QR cards",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-50 text-zinc-900">
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
