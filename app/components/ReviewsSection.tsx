"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Review = {
  id: string;
  name: string | null;
  rating: number | null;
  title: string | null;
  body: string;
};

function shuffle<T>(arr: T[]) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

function Stars({
  rating,
  size = "base",
}: {
  rating: number;
  size?: "base" | "lg";
}) {
  const full = Math.max(0, Math.min(5, rating));
  const sizeClass = size === "lg" ? "text-lg" : "text-base";

  return (
    <div
      className={`flex items-center justify-center gap-1 ${sizeClass}`}
      aria-label={`${full} out of 5`}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={
            i < full ? "text-amber-400" : "text-slate-300 dark:text-slate-600"
          }
        >
          ★
        </span>
      ))}
    </div>
  );
}

export default function ReviewsSection() {
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);

  // index is the target index
  const [index, setIndex] = useState(0);

  // renderIndex is what is currently shown on screen
  const [renderIndex, setRenderIndex] = useState(0);

  // slide animation state
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);
  const [offset, setOffset] = useState<0 | 1>(0);
  const [disableTransition, setDisableTransition] = useState(false);

  const [showForm, setShowForm] = useState(false);

  const [submitName, setSubmitName] = useState("");
  const [submitTitle, setSubmitTitle] = useState("");
  const [submitBody, setSubmitBody] = useState("");
  const [submitRating, setSubmitRating] = useState<number>(5);
  const [submitState, setSubmitState] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [submitError, setSubmitError] = useState<string>("");

  const timerRef = useRef<number | null>(null);

  const active = useMemo(() => {
    if (reviews.length === 0) return null;
    const safeIndex = renderIndex % reviews.length;
    return reviews[safeIndex];
  }, [reviews, renderIndex]);

  const incoming = useMemo(() => {
    if (reviews.length === 0) return null;

    const len = reviews.length;
    const base = ((renderIndex % len) + len) % len;

    const target =
      pendingIndex !== null
        ? ((pendingIndex % len) + len) % len
        : (base + 1) % len;

    return reviews[target];
  }, [reviews, renderIndex, pendingIndex]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/reviews", { cache: "no-store" });
        const json = await res.json().catch(() => null);

        if (!cancelled && json?.ok) {
          const items = Array.isArray(json.reviews)
            ? (json.reviews as Review[])
            : [];
          setReviews(shuffle(items));
          setIndex(0);
          setRenderIndex(0);
          setPendingIndex(null);
          setOffset(0);
          setDisableTransition(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (reviews.length <= 1) return;

    timerRef.current = window.setInterval(() => {
      setIndex((i) => i + 1);
    }, 10000);

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [reviews.length]);

  // Start slide when target index changes
  useEffect(() => {
    if (reviews.length <= 1) return;

    const len = reviews.length;
    const current = ((renderIndex % len) + len) % len;
    const target = ((index % len) + len) % len;

    if (target === current) return;

    setPendingIndex(target);
    setDisableTransition(false);
    setOffset(1);
  }, [index, renderIndex, reviews.length]);

  useEffect(() => {
    if (!showForm) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowForm(false);
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [showForm]);

  useEffect(() => {
    if (!showForm) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [showForm]);

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();

    if (!submitBody.trim() || submitBody.trim().length < 10) {
      setSubmitState("error");
      setSubmitError("Please write a bit more before submitting.");
      return;
    }

    setSubmitState("submitting");
    setSubmitError("");

    try {
      const res = await fetch("/api/reviews/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: submitName,
          title: submitTitle,
          body: submitBody,
          rating: submitRating,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        setSubmitState("error");
        setSubmitError(json?.error || "Something went wrong. Please try again.");
        return;
      }

      setSubmitState("success");
      setSubmitName("");
      setSubmitTitle("");
      setSubmitBody("");
      setSubmitRating(5);

      setTimeout(() => {
        setShowForm(false);
        setSubmitState("idle");
        setSubmitError("");
      }, 900);
    } catch {
      setSubmitState("error");
      setSubmitError("Something went wrong. Please try again.");
    }
  }

  if (loading) return null;

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-sky-100/80 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-sky-800/70 dark:bg-slate-950/40">
        <div className="text-center">
          <h2 className="text-lg font-semibold tracking-tight">
            What customers are saying
          </h2>
          <p className="mt-1 text-xs text-slate-900/70 dark:text-slate-100/70">
            Real reviews from people using Givio Cards.
          </p>
        </div>

        <div className="mt-5">
          {reviews.length > 0 ? (
            <div className="overflow-hidden">
              <div
                className={[
                  "flex w-full",
                  disableTransition ? "" : "transition-transform duration-300 ease-out",
                  offset === 1 ? "-translate-x-full" : "translate-x-0",
                ].join(" ")}
                onTransitionEnd={() => {
                  if (offset !== 1) return;
                  if (pendingIndex === null) return;

                  setRenderIndex(pendingIndex);
                  setPendingIndex(null);

                  setDisableTransition(true);
                  setOffset(0);

                  requestAnimationFrame(() => {
                    requestAnimationFrame(() => setDisableTransition(false));
                  });
                }}
              >
                <div className="w-full shrink-0">
                  <div className="flex flex-col items-center gap-3 text-center">
                    {active?.rating ? <Stars rating={active.rating} size="lg" /> : null}

                    <p className="text-lg font-medium leading-relaxed text-slate-900 dark:text-slate-50">
                      “{active?.body}”
                    </p>

                    <div className="flex flex-col items-center gap-1 text-xs text-slate-900/70 dark:text-slate-100/70">
                      <span className="font-medium text-slate-900 dark:text-slate-50">
                        {active?.name || "Verified customer"}
                      </span>
                      {active?.title ? <span>{active.title}</span> : null}
                    </div>
                  </div>
                </div>

                <div className="w-full shrink-0">
                  <div className="flex flex-col items-center gap-3 text-center">
                    {incoming?.rating ? (
                      <Stars rating={incoming.rating} size="lg" />
                    ) : null}

                    <p className="text-lg font-medium leading-relaxed text-slate-900 dark:text-slate-50">
                      “{incoming?.body}”
                    </p>

                    <div className="flex flex-col items-center gap-1 text-xs text-slate-900/70 dark:text-slate-100/70">
                      <span className="font-medium text-slate-900 dark:text-slate-50">
                        {incoming?.name || "Verified customer"}
                      </span>
                      {incoming?.title ? <span>{incoming.title}</span> : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-center text-base leading-relaxed text-slate-900/70 dark:text-slate-100/70">
              Be the first to leave a review.
            </p>
          )}
        </div>

        {reviews.length > 1 ? (
          <div className="mt-5 flex justify-center gap-1.5">
            {reviews.slice(0, Math.min(8, reviews.length)).map((r, i) => {
              const isActive = active?.id === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Show review ${i + 1}`}
                  className={[
                    "h-2 w-2 rounded-full transition",
                    isActive
                      ? "bg-sky-600"
                      : "bg-slate-300 hover:bg-slate-400 dark:bg-slate-700 dark:hover:bg-slate-600",
                  ].join(" ")}
                />
              );
            })}
          </div>
        ) : null}

        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => {
              setSubmitState("idle");
              setSubmitError("");
              setShowForm(true);
            }}
            className="inline-flex items-center justify-center rounded-full bg-sky-700 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-sky-600 focus-visible:outline-none focus-visible:ring focus-visible:ring-sky-500/60 disabled:opacity-60 dark:bg-sky-500 dark:hover:bg-sky-400"
          >
            Submit review
          </button>
        </div>
      </div>

      {showForm ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Leave a review"
        >
          <button
            type="button"
            aria-label="Close review form"
            onClick={() => setShowForm(false)}
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
          />

          <div className="relative w-full max-w-2xl rounded-3xl border border-sky-100/80 bg-white p-6 shadow-xl dark:border-sky-800/70 dark:bg-slate-950">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold tracking-tight">
                  Leave a review
                </h3>
                <p className="mt-1 text-xs text-slate-900/70 dark:text-slate-100/70">
                  Your feedback helps more people discover Givio Cards.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 dark:hover:bg-slate-900"
              >
                Close
              </button>
            </div>

            <form onSubmit={submitReview} className="mt-5 space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-xs font-medium text-slate-900/80 dark:text-slate-100/80">
                    Name
                  </span>
                  <input
                    value={submitName}
                    onChange={(e) => setSubmitName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:ring focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
                    placeholder="Optional"
                    autoFocus
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-xs font-medium text-slate-900/80 dark:text-slate-100/80">
                    Title
                  </span>
                  <input
                    value={submitTitle}
                    onChange={(e) => setSubmitTitle(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:ring focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
                    placeholder="Optional"
                  />
                </label>
              </div>

              <label className="space-y-2 block">
                <span className="text-xs font-medium text-slate-900/80 dark:text-slate-100/80">
                  Rating
                </span>

                <div className="flex items-center gap-2">
                  {Array.from({ length: 5 }).map((_, i) => {
                    const starValue = i + 1;
                    const isActive = starValue <= submitRating;

                    return (
                      <button
                        key={starValue}
                        type="button"
                        onClick={() => setSubmitRating(starValue)}
                        className="text-2xl transition"
                        aria-label={`Rate ${starValue} stars`}
                      >
                        <span
                          className={
                            isActive
                              ? "text-amber-400"
                              : "text-slate-300 hover:text-amber-300 dark:text-slate-600 dark:hover:text-amber-300"
                          }
                        >
                          ★
                        </span>
                      </button>
                    );
                  })}
                </div>

                <p className="text-[11px] text-slate-900/60 dark:text-slate-100/60">
                  {submitRating} out of 5 stars
                </p>
              </label>

              <label className="space-y-1 block">
                <span className="text-xs font-medium text-slate-900/80 dark:text-slate-100/80">
                  Review
                </span>
                <textarea
                  value={submitBody}
                  onChange={(e) => setSubmitBody(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:ring focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
                  placeholder="What did you like about Givio Cards?"
                  required
                />
              </label>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={submitState === "submitting"}
                  className="inline-flex items-center justify-center rounded-full bg-sky-700 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-sky-600 disabled:opacity-60 dark:bg-sky-500 dark:hover:bg-sky-400"
                >
                  {submitState === "submitting" ? "Submitting" : "Submit review"}
                </button>

                {submitState === "success" ? (
                  <p className="text-xs text-slate-900/70 dark:text-slate-100/70">
                    Thanks. Your review was submitted.
                  </p>
                ) : null}

                {submitState === "error" ? (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {submitError}
                  </p>
                ) : null}
              </div>

              <p className="text-[11px] text-slate-900/60 dark:text-slate-100/60">
                Reviews appear after approval.
              </p>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}