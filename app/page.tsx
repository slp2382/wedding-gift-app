"use client";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 flex items-center justify-center px-4 dark:bg-zinc-950 dark:text-zinc-50">
      <main className="w-full max-w-2xl space-y-10">
        {/* Header */}
        <header className="space-y-3">
          <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
            Early concept
          </p>
          <h1 className="text-4xl font-semibold tracking-tight">
            Wedding cards that carry cash with a simple scan
          </h1>
          <p className="text-base text-zinc-600 dark:text-zinc-400">
            Buy a physical card, scan one code to load a gift, and the couple
            scans the same code at the wedding to move the money to their bank.
            No more last minute trips to the bank machine.
          </p>
        </header>

        {/* How it works */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">How it works</h2>
          <ol className="space-y-3 text-sm text-zinc-700 dark:text-zinc-300">
            <li>
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs font-medium mr-2">
                1
              </span>
              You buy a card in a store and scan the code inside.
            </li>
            <li>
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs font-medium mr-2">
                2
              </span>
              Our site lets you pick an amount and load your gift securely.
            </li>
            <li>
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs font-medium mr-2">
                3
              </span>
              The couple scans the same code and sends the funds to their bank.
            </li>
          </ol>
        </section>

        {/* Call to action */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Test drive placeholder</h2>
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            This is only a demo view. In the real product, this button would
            start the flow to load money onto a card.
          </p>
          <button
            className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-medium bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition"
            onClick={() => alert("Later this will start the card setup flow")}
          >
            Pretend to load a card
          </button>
        </section>

        {/* Footer */}
        <footer className="pt-4 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
          Built as a first draft using Next and Tailwind.
        </footer>
      </main>
    </div>
  );
}
