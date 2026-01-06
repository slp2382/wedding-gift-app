"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "gl_lead_popup_v1";

function nowMs() {
  return Date.now();
}

function readSuppressUntil(): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { suppressUntil?: number };
    if (!parsed?.suppressUntil) return null;
    return Number(parsed.suppressUntil) || null;
  } catch {
    return null;
  }
}

function writeSuppressDays(days: number) {
  const suppressUntil = nowMs() + days * 24 * 60 * 60 * 1000;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ suppressUntil }));
}

function isValidEmail(email: string) {
  const v = email.trim();
  if (v.length < 6 || v.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export default function EmailCaptureModal() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">(
    "idle",
  );
  const [errorText, setErrorText] = useState<string | null>(null);

  const hasOpenedRef = useRef(false);

  const utm = useMemo(() => {
    if (typeof window === "undefined") return {};
    const sp = new URLSearchParams(window.location.search);
    const pick = (k: string) => sp.get(k) || undefined;
    return {
      utm_source: pick("utm_source"),
      utm_medium: pick("utm_medium"),
      utm_campaign: pick("utm_campaign"),
      utm_term: pick("utm_term"),
      utm_content: pick("utm_content"),
    };
  }, []);

  const canShow = () => {
    const until = readSuppressUntil();
    if (!until) return true;
    return until <= nowMs();
  };

  const close = (days = 45) => {
    try {
      writeSuppressDays(days);
    } catch {}
    setOpen(false);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!canShow()) return;

    const t = window.setTimeout(() => {
      if (hasOpenedRef.current) return;
      if (!canShow()) return;
      hasOpenedRef.current = true;
      setOpen(true);
    }, 7000);

    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!canShow()) return;

    const onMouseLeave = (e: MouseEvent) => {
      if (hasOpenedRef.current) return;
      if (!canShow()) return;
      if (e.clientY > 0) return;
      hasOpenedRef.current = true;
      setOpen(true);
    };

    document.addEventListener("mouseout", onMouseLeave);
    return () => document.removeEventListener("mouseout", onMouseLeave);
  }, []);

  const submit = async () => {
    setErrorText(null);

    const trimmed = email.trim();
    if (!isValidEmail(trimmed)) {
      setErrorText("Enter a valid email address.");
      return;
    }

    setStatus("saving");

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmed,
          source: "homepage_popup",
          consent: true,
          website: "",
          ...utm,
        }),
      });

      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        setStatus("error");
        setErrorText(j?.error || "Could not save. Try again.");
        return;
      }

      setStatus("success");
      writeSuppressDays(365);

      window.setTimeout(() => setOpen(false), 900);
    } catch (err) {
      setStatus("error");
      setErrorText("Could not save. Try again.");
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Join GiftLink updates"
    >
      <button
        className="absolute inset-0 cursor-default bg-black/50"
        aria-label="Close"
        onClick={() => close(45)}
      />

      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-sky-200/70 bg-white shadow-2xl dark:border-sky-700/60 dark:bg-slate-950">
        <div className="pointer-events-none absolute -inset-12 bg-gradient-to-br from-sky-500/15 via-sky-400/10 to-sky-300/10 blur-2xl" />

        <div className="relative p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">
                GiftLink updates
              </p>
              <h3 className="mt-2 text-lg font-semibold tracking-tight text-slate-950 dark:text-slate-50">
                Join our mailing list to recieve 10% off your next order!
              </h3>
              <p className="mt-2 text-sm text-slate-900/80 dark:text-slate-100/80">
                Enter your email to get product updates and discounts.
              </p>
            </div>

            <button
              type="button"
              onClick={() => close(45)}
              className="rounded-full border border-sky-200/80 bg-white px-3 py-1 text-xs font-medium text-slate-900 shadow-sm hover:bg-sky-50 dark:border-sky-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
              aria-label="Dismiss"
            >
              Close
            </button>
          </div>

          <div className="mt-5 flex flex-col gap-3">
            <label className="text-xs font-medium text-slate-900/80 dark:text-slate-100/80">
              Email
            </label>

            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              className="w-full rounded-2xl border border-sky-200/80 bg-white px-4 py-3 text-sm text-slate-950 shadow-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-300/40 dark:border-sky-800 dark:bg-slate-950 dark:text-slate-50 dark:focus:border-sky-600 dark:focus:ring-sky-500/30"
              disabled={status === "saving" || status === "success"}
            />

            {errorText ? (
              <p className="text-xs text-rose-600 dark:text-rose-400">
                {errorText}
              </p>
            ) : null}

            <div className="mt-1 flex items-center gap-3">
              <button
                type="button"
                onClick={submit}
                disabled={status === "saving" || status === "success"}
                className="inline-flex w-full items-center justify-center rounded-full bg-sky-700 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-sky-500 dark:hover:bg-sky-400"
              >
                {status === "saving"
                  ? "Saving"
                  : status === "success"
                    ? "Saved"
                    : "Notify me"}
              </button>
            </div>

            <p className="mt-2 text-[11px] text-slate-900/60 dark:text-slate-100/60">
              By submitting, you consent to receive emails from GiftLink. You can
              unsubscribe any time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
