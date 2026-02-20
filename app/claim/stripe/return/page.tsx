// app/claim/stripe/return/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Status = "loading" | "success" | "error";

const FEE_PERCENT = 0.035;
const FEE_FIXED_CENTS = 30;

function formatMoney(cents: number, currency: string) {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  });
}

function clampNonNegative(n: number) {
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}

export default function StripeReturnPage() {
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState<string>("");

  // New fields
  const [currency, setCurrency] = useState<string>("usd");
  const [netCents, setNetCents] = useState<number | null>(null);
  const [feeCents, setFeeCents] = useState<number | null>(null);
  const [grossCents, setGrossCents] = useState<number | null>(null);

  useEffect(() => {
    async function runClaim() {
      try {
        const search = window.location.search;
        const params = new URLSearchParams(search);
        const payoutRequestId = params.get("payout_request_id");

        if (!payoutRequestId) {
          setStatus("error");
          setMessage("Missing payout request id. Please contact Givio Cards support.");
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
              "We could not complete your payout. Please contact Givio Cards support.",
          );
          return;
        }

        setStatus("success");

        if (typeof data.currency === "string") {
          setCurrency(data.currency);
        }

        // Preferred new response contract from the claim route:
        // netAmountCents, feeCents, grossAmountCents
        const nextNet =
          typeof data.netAmountCents === "number"
            ? data.netAmountCents
            : typeof data.amount === "number"
              ? data.amount
              : null;

        const nextFee = typeof data.feeCents === "number" ? data.feeCents : null;
        const nextGross =
          typeof data.grossAmountCents === "number" ? data.grossAmountCents : null;

        setNetCents(nextNet);
        setFeeCents(nextFee);
        setGrossCents(nextGross);

        // If API did not send fee and gross, compute an estimate for display only
        // based on net as a fallback. This is only an estimate because rounding
        // depends on how the server computes fees.
        if (nextNet != null && nextFee == null && nextGross == null) {
          const approxGross = clampNonNegative(
            (nextNet + FEE_FIXED_CENTS) / (1 - FEE_PERCENT),
          );
          const approxFee = clampNonNegative(approxGross * FEE_PERCENT + FEE_FIXED_CENTS);
          setGrossCents(approxGross);
          setFeeCents(approxFee);
        }
      } catch (err) {
        console.error("StripeReturnPage claim error", err);
        setStatus("error");
        setMessage("Something went wrong while finalizing your payout. Please try again.");
      }
    }

    runClaim();
  }, []);

  const formatted = useMemo(() => {
    const ccy = currency || "usd";
    return {
      net: netCents != null ? formatMoney(netCents, ccy) : null,
      fee: feeCents != null ? formatMoney(feeCents, ccy) : null,
      gross: grossCents != null ? formatMoney(grossCents, ccy) : null,
    };
  }, [netCents, feeCents, grossCents, currency]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-emerald-50 to-emerald-100 px-4 py-10 text-emerald-950">
      <div className="mx-auto flex min-h-[80vh] max-w-xl flex-col items-center justify-center text-center space-y-6">
        {/* Wordmark */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-700 via-emerald-600 to-emerald-500 shadow-md shadow-emerald-400/40">
            <span className="text-lg font-semibold text-emerald-50">g</span>
          </div>
          <div className="leading-tight text-left">
            <p className="text-lg font-semibold tracking-tight">Givio Cards</p>
            <p className="text-xs text-emerald-700/80">Wedding gifting with QR cards</p>
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
              We are connecting to Stripe to send your gift to the bank account you just set up.
            </p>
            <p className="text-[11px] text-emerald-800/80 max-w-md mx-auto">
              Bank transfer payouts include a Givio Cards fee of 3.5% plus $0.30.
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
              {formatted.net
                ? `We have created a payout for ${formatted.net}. Stripe will deposit it to your bank account according to their payout schedule.`
                : "We have created a payout for your gift. Stripe will deposit it to your bank account according to their payout schedule."}
            </p>

            {(formatted.gross || formatted.fee) && (
              <div className="w-full max-w-md rounded-2xl border border-emerald-200 bg-white/70 p-4 text-left shadow-sm">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-emerald-900/80">Gift amount</span>
                  <span className="font-medium text-emerald-950">
                    {formatted.gross ?? "Unavailable"}
                  </span>
                </div>

                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-emerald-900/80">Givio Cards fee</span>
                  <span className="font-medium text-emerald-950">
                    {formatted.fee ?? "Unavailable"}
                  </span>
                </div>

                <div className="mt-3 h-px bg-emerald-200/70" />

                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-emerald-900/80">You receive</span>
                  <span className="font-semibold text-emerald-950">
                    {formatted.net ?? "Unavailable"}
                  </span>
                </div>

                <p className="mt-2 text-[11px] text-emerald-800/80">
                  Fee is 3.5% plus $0.30. Actual amounts may vary by a few cents due to
                  rounding.
                </p>
              </div>
            )}
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
            <p className="text-sm text-rose-900/85 max-w-md mx-auto">{message}</p>
          </>
        )}

        <div className="space-y-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-medium text-emerald-50 shadow-sm transition hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring focus-visible:ring-emerald-500/60"
          >
            Back to Givio Cards
          </Link>
          <p className="text-[11px] text-emerald-800/80">
            You can return to your Givio Card at any time to see the updated status.
          </p>
        </div>
      </div>
    </div>
  );
}