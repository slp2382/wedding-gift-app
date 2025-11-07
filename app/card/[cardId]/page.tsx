import Link from "next/link";

type CardPageProps = {
  params: {
    cardId: string;
  };
};

export default function CardPage({ params }: CardPageProps) {
  const { cardId } = params;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 flex items-center justify-center px-4 dark:bg-zinc-950 dark:text-zinc-50">
      <main className="w-full max-w-xl space-y-8">
        <header className="space-y-2">
          <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
            Demo card view
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            You have opened a gift card
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            In a real version of this product, this page would look up the card
            in a database and show the live gift amount and message from the
            guest.
          </p>
        </header>

        <section className="rounded-xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-3">
          <p className="text-xs font-semibold text-zinc-500">
            Card information
          </p>
          <p>
            Card id{" "}
            <span className="font-mono text-xs bg-zinc-100 px-1 py-0.5 rounded dark:bg-zinc-800">
              {cardId}
            </span>
          </p>
          <p className="text-zinc-600 dark:text-zinc-300">
            Right now this card is just a demo id. No real money is stored yet,
            but this is the spot where the couple would see the details of the
            gift that was loaded on the main page.
          </p>
        </section>

        <section className="space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
          <p>
            To try the full flow, go back to the main page, fill out the load
            form, and scan or open the new QR code from your phone.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-medium bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition"
          >
            Back to load a card
          </Link>
        </section>
      </main>
    </div>
  );
}
