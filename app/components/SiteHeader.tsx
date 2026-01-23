"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function SiteHeader() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const onScroll = () => {
      setIsVisible(window.scrollY === 0);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={[
        "fixed left-0 right-0 top-0 z-50",
        "border-b border-sky-100/80 bg-sky-50/70 backdrop-blur",
        "dark:border-sky-800/70 dark:bg-slate-950/60",
        "transition-all duration-200",
        isVisible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none",
      ].join(" ")}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-2.5">
        <Link href="/" className="flex items-center">
          <Image
            src="/giftlink_logo.svg"
            alt="GiftLink"
            width={200}
            height={200}
            className="h-9 w-auto sm:h-10"
            priority
          />
        </Link>

        <div className="flex items-center gap-4">
          <nav className="hidden items-center gap-6 md:flex">
            <a
              href="#how-it-works"
              className="text-sm font-medium text-slate-900/80 hover:text-slate-950 dark:text-slate-100/80 dark:hover:text-slate-50"
            >
              How it works
            </a>
            <a
              href="#faq"
              className="text-sm font-medium text-slate-900/80 hover:text-slate-950 dark:text-slate-100/80 dark:hover:text-slate-50"
            >
              FAQ
            </a>
          </nav>

          <Link
            href="/shop"
            className="inline-flex items-center justify-center rounded-full bg-sky-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-sky-600 focus-visible:outline-none focus-visible:ring focus-visible:ring-sky-500/60 dark:bg-sky-500 dark:hover:bg-sky-400"
          >
            Shop
          </Link>
        </div>
      </div>
    </header>
  );
}
