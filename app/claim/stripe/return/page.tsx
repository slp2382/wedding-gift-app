// app/claim/stripe/return/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Status = "loading" | "success" | "error";

export default function StripeReturnPage() {
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState<string>("");
  const [amount, setAmount] = useState<number | null>(null);
  const [currency, setCurrency] = useState<string>("usd");

  useEffect(() => {
    async function runClaim() {
      try {
        // Read payout_request_id from the URL query string on the client
        const search = window.location.search;
        const params = new URLSearchParams(search);
        const payoutRequestId = params.get("payout_request_id");

        if (!payoutRequestId) {
          setStatus("error");
          setMessage(
            "Missing payout request id. Please contact GiftLink support."
          );
          return;
        }

        const res = await fetch("/api/stripe/connect/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payoutRequestId }),
        });

        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.ok) {
          setStatus("error");
          setMessage(
            data?.error ??
              "We could not complete your payout. Please contact GiftLink support."
          );
          return;
        }

        setStatus("success");
        if (typeof data.amount === "number") {
          setAmount(data.amount);
        }
        if (typeof data.currency === "string") {
          setCurrency(data.currency);
        }
      } catch (err) {
        console.error("StripeReturnPage claim error", err);
        setStatus("error");
        setMessage(
          "Something went wrong while finalizing your payout. Please try again."
        );
      }
    }

    runClaim();
  }, []);

  const formattedAmount =
    amount != null
      ? (amount / 100).toLocaleString("en-US", {
          style: "currency",
          currency: currency.toUpperCase(),
        })
      : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-emerald-50 to-emerald-100 px-4 py-10 text-emerald-950">
      <div className="mx-auto flex min-h-[80vh] max-w-xl flex-col items-center justify-center text-center space-y-6">
        {/* Wordmark */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-700 via-emerald-600 to-emerald-500 shadow-md shadow-emerald-400/40">
            <span className="text-lg font-semibold text-emerald-50">
              G
            </span>
          </div>
          <div className="leading-tight text-left">
            <p className="text-lg font-semibold tracking-tight">
              GiftLink
            </p>
            <p className="text-xs text-emerald-700/80">
              Wedding gift QR cards
            </p>
          </div>
        </div>

        {status === "loading" && (
          <>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-700">
              Finalizing payout
            </p>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
              One moment while we finish your payout
            </h1>
            <p className="text-sm text-emerald-900/85 max-w-md mx-auto">
              We are connecting to Stripe to send your wedding gift to the bank
              account you just set up.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-700">
              Payout created
            </p>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
              Your gift is on its way
            </h1>
            <p className="text-sm text-emerald-900/85 max-w-md mx-auto">
              {formattedAmount
                ? `We have created a payout for ${formattedAmount}. Stripe will deposit it to your bank account according to their payout schedule.`
                : "We have created a payout for your gift. Stripe will deposit it to your bank account according to their payout schedule."}
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-rose-700">
              Payout issue
            </p>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-rose-900">
              We could not finish your payout
            </h1>
            <p className="text-sm text-rose-900/85 max-w-md mx-auto">
              {message}
            </p>
          </>
        )}

        <div className="space-y-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-medium text-emerald-50 shadow-sm transition hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring focus-visible:ring-emerald-500/60"
          >
            Back to GiftLink
          </Link>
          <p className="text-[11px] text-emerald-800/80">
            You can return to your GiftLink card at any time to see the updated
            status.
          </p>
        </div>
      </div>
    </div>
  );
}
