"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import QRCode from "react-qr-code";
import { jsPDF } from "jspdf";
import QRCodeLib from "qrcode";

type CreateCardResponse = {
  cardId?: string;
  card_id?: string;
  error?: string;
};

export default function HomePage() {
  const [giverName, setGiverName] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const [createdCardId, setCreatedCardId] = useState<string | null>(null);
  const [createdCardUrl, setCreatedCardUrl] = useState<string | null>(null);

  async function handleCreateCard(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreateError(null);
    setCheckoutError(null);
    setCreatedCardId(null);
    setCreatedCardUrl(null);

    const trimmedName = giverName.trim();
    const amountNumber = Number(amount);

    if (!trimmedName) {
      setCreateError("Please enter your name.");
      return;
    }

    if (!amountNumber || amountNumber <= 0) {
      setCreateError("Please enter a gift amount greater than zero.");
      return;
    }

    setCreating(true);

    try {
      const createRes = await fetch("/api/create-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          giverName: trimmedName,
          amount: amountNumber,
          note: note.trim() || null,
        }),
      });

      if (!createRes.ok) {
        const result = (await createRes.json().catch(() => null)) as
          | CreateCardResponse
          | null;
        const message =
          (result && result.error) ||
          "Could not create a new GiftLink card. Please try again.";
        setCreateError(message);
        setCreating(false);
        return;
      }

      const result = (await createRes.json()) as CreateCardResponse;
      const cardId = result.cardId || result.card_id;

      if (!cardId) {
        setCreateError(
          "The server did not return a card id. Please try again.",
        );
        setCreating(false);
        return;
      }

      const origin =
        typeof window !== "undefined"
          ? window.location.origin
          : "https://giftlink.cards";

      const url = `${origin}/card/${cardId}`;
      setCreatedCardId(cardId);
      setCreatedCardUrl(url);
    } catch (err) {
      console.error("Error creating card:", err);
      setCreateError("Something went wrong while creating your GiftLink.");
    }

    setCreating(false);
  }

  async function handleOpenCheckout() {
    if (!createdCardId) {
      setCheckoutError(
        "You need to create a GiftLink card before opening checkout.",
      );
      return;
    }

    const trimmedName = giverName.trim();
    const amountNumber = Number(amount);

    if (!trimmedName || !amountNumber || amountNumber <= 0) {
      setCheckoutError(
        "Your name and amount must be filled out before checkout.",
      );
      return;
    }

    setCheckoutError(null);
    setCheckoutLoading(true);

    try {
      const res = await fetch("/api/load-gift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: createdCardId,
          giverName: trimmedName,
          amount: amountNumber,
          note: note.trim() || null,
        }),
      });

      if (!res.ok) {
        const result = await res.json().catch(() => null);
        const message =
          (result && result.error) ||
          "Could not start checkout. Please try again.";
        setCheckoutError(message);
        setCheckoutLoading(false);
        return;
      }

      const result = await res.json();
      const redirectUrl = result.url || result.checkoutUrl;
      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        setCheckoutError(
          "Checkout link was not returned. Please try again.",
        );
        setCheckoutLoading(false);
      }
    } catch (err) {
      console.error("Error opening Stripe checkout:", err);
      setCheckoutError(
        "Something went wrong while starting secure checkout.",
      );
      setCheckoutLoading(false);
    }
  }

  async function handleDownloadPdf() {
    if (!createdCardUrl) return;

    try {
      const qrDataUrl = await QRCodeLib.toDataURL(createdCardUrl, {
        margin: 1,
        width: 256,
      });

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "letter",
      });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("GiftLink Card QR", 72, 72);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.text(
        "Place this QR code inside your card or on your wedding signage.",
        72,
        96,
      );

      doc.addImage(qrDataUrl, "PNG", 72, 120, 256, 256);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("GiftLink URL:", 72, 400);
      doc.setFont("courier", "normal");
      doc.text(doc.splitTextToSize(createdCardUrl, 460), 72, 414);

      doc.save("giftlink-card.pdf");
    } catch (error) {
      console.error("Error generating PDF", error);
      alert("Sorry, something went wrong while generating the PDF.");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-emerald-50 to-stone-100 text-emerald-950 dark:from-emerald-950 dark:via-emerald-950 dark:to-emerald-950 dark:text-emerald-50">
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Top nav / wordmark */}
        <header className="mb-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* favicon logo */}
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-2xl border border-emerald-800 bg-emerald-900 shadow-md shadow-emerald-500/20 dark:border-emerald-700 dark:bg-emerald-900 dark:shadow-emerald-700/40">
              <img
                src="/favicon.ico"
                alt="GiftLink logo"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="leading-tight">
              <p className="text-lg font-semibold tracking-tight">GiftLink</p>
              <p className="text-xs text-emerald-700/80 dark:text-emerald-200/80">
                QR powered wedding gifts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="#diy"
              className="hidden rounded-full border border-emerald-500/70 px-3 py-1.5 text-xs font-medium text-emerald-800 underline-offset-4 hover:bg-emerald-50 hover:text-emerald-900 dark:border-emerald-300/80 dark:text-emerald-50 dark:hover:bg-emerald-900/50 md:inline-flex"
            >
              Create your own GiftLink
            </a>
          </div>
        </header>

        {/* Hero */}
        <main className="space-y-24 pb-16">
          <section className="grid gap-10 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] md:items-center">
            <div className="space-y-5">
              <p className="inline-flex items-center rounded-full border border-emerald-200/80 bg-emerald-50/80 px-3 py-1 text-xs font-medium text-emerald-700 shadow-sm backdrop-blur dark:border-emerald-500/50 dark:bg-emerald-900/60 dark:text-emerald-200">
                New · Cashless wedding gifts
              </p>
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                Physical wedding cards with{" "}
                <span className="bg-gradient-to-r from-emerald-700 via-emerald-500 to-emerald-300 bg-clip-text text-transparent">
                  scannable gift links
                </span>
                .
              </h1>
              <p className="max-w-xl text-sm text-emerald-900/80 dark:text-emerald-100/80">
                GiftLink turns a simple card into a QR powered gift. Guests scan
                a card, load a monetary gift through Stripe, and the couple
                scans the same card to claim their funds later. No envelopes, no
                loose cash.
              </p>

              <div className="flex flex-wrap gap-3">
                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center rounded-full bg-emerald-700 px-4 py-2.5 text-sm font-medium text-emerald-50 shadow-sm transition hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring focus-visible:ring-emerald-500/60 dark:bg-emerald-500 dark:hover:bg-emerald-400"
                >
                  How GiftLink works
                </a>
                <a
                  href="#diy"
                  className="inline-flex items-center justify-center rounded-full border border-emerald-200/80 bg-emerald-50/80 px-4 py-2.5 text-sm font-medium text-emerald-900 shadow-sm hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring focus-visible:ring-emerald-500/40 dark:border-emerald-700 dark:bg-emerald-900/70 dark:text-emerald-50 dark:hover:bg-emerald-900"
                >
                  Create your own QR card
                </a>
              </div>

              <p className="text-[11px] text-emerald-900/70 dark:text-emerald-200/80">
                Couples keep the gift amount. Guests cover a small service fee.
                Payments are handled securely by Stripe.
              </p>
            </div>

            {/* Hero image: real GiftLink card */}
            <div className="relative">
              <div className="pointer-events-none absolute -inset-6 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-emerald-400/10 to-emerald-300/10 blur-2xl dark:from-emerald-500/15 dark:via-emerald-400/15 dark:to-emerald-300/15" />
              <div className="relative rounded-3xl border border-emerald-200/80 bg-stone-50/95 p-5 shadow-xl shadow-emerald-100/70 backdrop-blur-sm dark:border-emerald-700/70 dark:bg-emerald-950/90 dark:shadow-none">
                <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-300">
                  A real GiftLink card
                </p>
                <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-stone-50 dark:border-emerald-800 dark:bg-emerald-950">
                  <Image
                    src="/Example_Card.png"
                    alt="Inside view of a GiftLink card showing a QR code and 'Congratulations' message"
                    width={768}
                    height={768}
                    className="h-full w-full object-cover"
                  />
                </div>
                <p className="mt-2 text-[11px] text-emerald-900/80 dark:text-emerald-100/80">
                  Each card has its own unique QR code that guests can scan to
                  send a gift, and the couple can later scan to claim it.
                </p>
              </div>
            </div>
          </section>

          {/* How it works */}
          <section id="how-it-works" className="space-y-6">
            <div className="space-y-2 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-300">
                How it works
              </p>
              <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
                Three simple steps — one QR code
              </h2>
              <p className="mx-auto max-w-2xl text-sm text-emerald-900/80 dark:text-emerald-100/80">
                Every GiftLink card carries a single QR code. Givers use it to
                load cash gifts, and recipients use the same code to claim them
                instantly.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-emerald-100/80 bg-stone-50/90 p-4 text-sm shadow-sm dark:border-emerald-800/70 dark:bg-emerald-950/80">
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600/80 dark:text-emerald-300/80">
                  1 · Gift
                </p>
                <h3 className="text-sm font-semibold">Buy a GiftLink card</h3>
                <p className="mt-2 text-xs text-emerald-900/80 dark:text-emerald-100/80">
                  Pick up a GiftLink card from a partner shop or order a pack
                  online. Each one comes with its own unique QR code, ready to
                  personalize.
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-100/80 bg-stone-50/90 p-4 text-sm shadow-sm dark:border-emerald-800/70 dark:bg-emerald-950/80">
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600/80 dark:text-emerald-300/80">
                  2 · Link
                </p>
                <h3 className="text-sm font-semibold">
                  Scan the QR to load your gift
                </h3>
                <p className="mt-2 text-xs text-emerald-900/80 dark:text-emerald-100/80">
                  Givers scan the card&apos;s QR code, enter their name, note,
                  and amount, and complete payment securely through Stripe.
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-100/80 bg-stone-50/90 p-4 text-sm shadow-sm dark:border-emerald-800/70 dark:bg-emerald-950/80">
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600/80 dark:text-emerald-300/80">
                  3 · Give
                </p>
                <h3 className="text-sm font-semibold">
                  The recipient scans to claim
                </h3>
                <p className="mt-2 text-xs text-emerald-900/80 dark:text-emerald-100/80">
                  The recipient scans that same QR code to instantly claim and
                  deposit their gift through our secure payment system.
                </p>
              </div>
            </div>
          </section>

          {/* CTAs for cards & locations */}
          <section className="space-y-4 rounded-3xl border border-emerald-100/80 bg-stone-50/95 p-6 shadow-lg shadow-emerald-100/70 dark:border-emerald-800 dark:bg-emerald-950/85 dark:shadow-none">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-300">
                  For couples and shops
                </p>
                <h2 className="text-lg font-semibold tracking-tight">
                  Ready to put GiftLink in the real world?
                </h2>
                <p className="text-sm text-emerald-900/80 dark:text-emerald-100/80">
                  We are rolling out physical GiftLink cards with select shops.
                  You can also order cards directly, or use the DIY option below
                  to print your own.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/shop"
                  className="inline-flex items-center justify-center rounded-full bg-emerald-700 px-4 py-2.5 text-sm font-medium text-emerald-50 shadow-sm transition hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring focus-visible:ring-emerald-500/60 dark:bg-emerald-500 dark:hover:bg-emerald-400"
                >
                  Order GiftLink card packs
                </Link>
                <Link
                  href="/locations"
                  className="inline-flex items-center justify-center rounded-full border border-emerald-200/80 bg-emerald-50/80 px-4 py-2.5 text-sm font-medium text-emerald-900 shadow-sm hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring focus-visible:ring-emerald-500/40 dark:border-emerald-700 dark:bg-emerald-900/70 dark:text-emerald-50 dark:hover:bg-emerald-900"
                >
                  Find retail locations
                </Link>
              </div>
            </div>
          </section>

          {/* DIY GiftLink section */}
          <section
            id="diy"
            className="space-y-5 rounded-3xl border border-emerald-100/80 bg-stone-50/95 p-6 shadow-lg shadow-emerald-100/70 dark:border-emerald-800 dark:bg-emerald-950/85 dark:shadow-none"
          >
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-300">
                DIY option
              </p>
              <h2 className="text-lg font-semibold tracking-tight">
                Create your own GiftLink and print the QR code
              </h2>
              <p className="text-sm text-emerald-900/80 dark:text-emerald-100/80">
                If you do not have printed GiftLink cards yet, you can create a
                one off GiftLink here, print or save the QR code, and place it
                on your own card or wedding signage. After you create the link,
                you can load it with a gift using secure checkout.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:items-start">
              {/* Form */}
              <form
                onSubmit={handleCreateCard}
                className="space-y-3 rounded-2xl border border-emerald-100/80 bg-emerald-50/80 p-4 text-sm shadow-sm dark:border-emerald-800 dark:bg-emerald-950/80"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-emerald-900/80 dark:text-emerald-100/80">
                      Your name
                    </label>
                    <input
                      type="text"
                      value={giverName}
                      onChange={(e) => setGiverName(e.target.value)}
                      className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-emerald-950 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-50"
                      placeholder="Name to show on the card"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-emerald-900/80 dark:text-emerald-100/80">
                      Gift amount
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-emerald-500">
                        $
                      </span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full rounded-xl border border-emerald-200 bg-white pl-6 pr-3 py-2 text-sm text-emerald-950 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-50"
                        placeholder="150"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-emerald-900/80 dark:text-emerald-100/80">
                    Optional note
                  </label>
                  <textarea
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-emerald-950 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-50"
                    placeholder="Add a short message for the couple"
                  />
                </div>

                {createError && (
                  <p className="text-xs text-rose-600 dark:text-rose-400">
                    {createError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex w-full items-center justify-center rounded-full bg-emerald-700 px-4 py-2.5 text-sm font-medium text-emerald-50 shadow-sm transition hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring focus-visible:ring-emerald-500/60 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-emerald-500 dark:hover:bg-emerald-400"
                >
                  {creating
                    ? "Creating GiftLink…"
                    : "Create GiftLink and show QR"}
                </button>

                <p className="mt-1 text-[11px] text-emerald-900/70 dark:text-emerald-200/80">
                  After you create the link, you will see a QR code that you can
                  print or save, plus an option to load it with your gift right
                  away via Stripe.
                </p>
              </form>

              {/* QR + checkout column */}
              <div className="space-y-3 rounded-2xl border border-emerald-100/80 bg-stone-50/95 p-4 text-sm shadow-sm dark:border-emerald-800 dark:bg-emerald-950/80">
                {!createdCardId || !createdCardUrl ? (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-xs text-emerald-800/80 dark:text-emerald-200/80">
                    <p>Fill out the form and create a GiftLink to see its QR.</p>
                    <p className="text-[11px]">
                      You will be able to print it or include it in your own
                      card design.
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-300">
                      Your GiftLink
                    </p>
                    <div className="flex flex-col items-center gap-3">
                      <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-emerald-950">
                        <QRCode value={createdCardUrl} size={128} />
                      </div>
                      <p className="text-[11px] text-emerald-800/80 dark:text-emerald-200/80">
                        URL:
                        <br />
                        <span className="break-all font-mono text-[11px] text-emerald-900 dark:text-emerald-100">
                          {createdCardUrl}
                        </span>
                      </p>

                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard
                              .writeText(createdCardUrl)
                              .catch(() => {});
                          }}
                          className="inline-flex items-center justify-center rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-[11px] font-medium text-emerald-900 shadow-sm hover:bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-50 dark:hover:bg-emerald-900"
                        >
                          Copy link
                        </button>

                        <button
                          type="button"
                          onClick={handleDownloadPdf}
                          className="inline-flex items-center justify-center rounded-full bg-emerald-900 px-3 py-1.5 text-[11px] font-medium text-emerald-50 shadow-sm transition hover:bg-emerald-800 dark:bg-emerald-100 dark:text-emerald-900 dark:hover:bg-emerald-200"
                        >
                          Download printable PDF
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2 border-t border-emerald-100 pt-3 text-xs dark:border-emerald-800">
                      <p className="text-emerald-800/80 dark:text-emerald-200/80">
                        When you are ready, you can load this GiftLink with your
                        gift amount using secure Stripe checkout. The couple
                        card will then show the gift as ready to claim.
                      </p>

                      {checkoutError && (
                        <p className="text-xs text-rose-600 dark:text-rose-400">
                          {checkoutError}
                        </p>
                      )}

                      <button
                        type="button"
                        disabled={checkoutLoading}
                        onClick={handleOpenCheckout}
                        className="inline-flex w-full items-center justify-center rounded-full bg-emerald-700 px-4 py-2.5 text-sm font-medium text-emerald-50 shadow-sm transition hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring focus-visible:ring-emerald-500/60 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-emerald-500 dark:hover:bg-emerald-400"
                      >
                        {checkoutLoading
                          ? "Opening secure checkout…"
                          : "Load this card via Stripe"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="mt-6 border-t border-emerald-100/80 pt-4 text-[11px] text-emerald-800/80 dark:border-emerald-800 dark:text-emerald-200/80">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p>© {new Date().getFullYear()} GiftLink. All rights reserved.</p>
            <div className="flex gap-4">
              <Link href="#" className="hover:underline">
                Terms
              </Link>
              <Link href="#" className="hover:underline">
                Privacy
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
