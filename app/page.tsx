"use client";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 text-zinc-900 flex items-center justify-center px-4 py-10 dark:from-zinc-950 dark:to-zinc-900 dark:text-zinc-50">
      <main className="w-full max-w-3xl">
        <div className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-white/80 p-8 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80 md:p-10">
          {/* Accent glow */}
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-pink-500/10 blur-3xl" />

          <div className="space-y-10 relative">
            {/* Header */}
            <header className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 dark:bg-indigo-300" />
                Early concept preview
              </div>

              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                Wedding cards that carry cash
                <span className="block text-lg font-normal text-zinc-600 dark:text-zinc-400 sm:text-xl">
                  One code for loading and one simple scan to receive
                </span>
              </h1>

              <p className="text-base text-zinc-600 dark:text-zinc-400">
                Buy a physical card, scan a single code to load a gift, and the
                couple scans that same code at the wedding to move the money to
                their bank account. No more last minute trips to the bank
                machine.
              </p>
            </header>

            {/* Content grid */}
            <div className="grid gap-8 md:grid-cols-[minmax(0,1.4fr),minmax(0,1fr)] md:items-start">
              {/* How it works */}
              <section className="space-y-4">
                <h2 className="text-lg font-semibold">How it works</h2>
                <ol className="space-y-4 text-sm text-zinc-700 dark:text-zinc-300">
                  {[
                    "You buy a card in a store and scan the code inside.",
                    "Our site lets you pick an amount and load your gift securely.",
                    "The couple scans the same code and sends the funds to their bank.",
                  ].map((step, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex h-7 w-7 flex-none items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900">
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </section>

              {/* Call to action */}
              <section className="space-y-4 rounded-2xl border border-zinc-200 bg-zinc-50/70 p-5 text-sm dark:border-zinc-800 dark:bg-zinc-900/70">
                <h2 className="text-base font-semibold">Try the demo flow</h2>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  This is only a demo view. In the real product, this button
                  would start the secure flow to load money onto a card.
                </p>

                <button
                  className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition"
                  onClick={() =>
                    alert("Later this will start the card setup flow")
                  }
                >
                  Pretend to load a card
                  <span aria-hidden="true">↗</span>
                </button>

                <p className="text-[11px] text-zinc-500 dark:text-zinc-500">
                  No real money moves yet. This is just for testing wording and
                  flow.
                </p>
              </section>
            </div>

            {/* Footer */}
            <footer className="pt-3 border-t border-dashed border-zinc-200 text-xs text-zinc-500 dark:border-zinc-800">
              Built as a first draft using Next and Tailwind. Rough concept for
              a future in store product.
            </footer>
          </div>
        </div>
      </main>
    </div>
  );
}
