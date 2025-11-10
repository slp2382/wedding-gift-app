"use client";

import { Suspense } from "react";
import ShopPageClient from "./ShopPageClient";

export default function ShopPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-50 px-4 py-10 dark:bg-zinc-950" />
      }
    >
      <ShopPageClient />
    </Suspense>
  );
}
