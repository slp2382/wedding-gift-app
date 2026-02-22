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

function Stars({ rating }: { rating: number }) {
  const full = Math.max(0, Math.min(5, rating));
  return (
    <div className="flex items-center gap-1" aria-label={`${full} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < full ? "text-sky-600" : "text-slate-300"}>
          ★
        </span>
      ))}
    </div>
  );
}

export default function ReviewsSection() {
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [index, setIndex] = useState(0);

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
    const safeIndex = index % reviews.length;
    return reviews[safeIndex];
  }, [reviews, index]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/reviews", { cache: "no-store" });
        const json = await res.json();
        if (!cancelled && json?.ok) {
          const items = Array.isArray(json.reviews) ? (json.reviews as Review[]) : [];
          setReviews(shuffle(items));
          setIndex(0);
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
    }, 7000);

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [reviews.length]);

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
    } catch {
      setSubmitState("error");
      setSubmitError("Something went wrong. Please try again.");
    }
  }

  if (loading && reviews.length === 0) return null;
  if (!loading && reviews.length === 0) return null;

  return (
    <section className="space-y-10">
      <div className="rounded-3xl border border-sky-100/80 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-sky-800/70 dark:bg-slate-950/40">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              What customers are saying
            </h2>
            <p className="mt-1 text-xs text-slate-900/70 dark:text-slate-100/70">
              Real reviews from people using Givio Cards.
            </p>
          </div>

          {active?.rating ? <Stars rating={active.rating} /> : null}
        </div>

        <div className="mt-4">
          <p className="text-sm leading-relaxed text-slate-900/90 dark:text-slate-50/90">
            “{active?.body}”
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-900/70 dark:text-slate-100/70">
            <span className="font-medium text-slate-900 dark:text-slate-50">
              {active?.name || "Verified customer"}
            </span>
            {active?.title ? <span>· {active.title}</span> : null}
          </div>
        </div>

        {reviews.length > 1 ? (
          <div className="mt-5 flex gap-1.5">
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
      </div>

      <div className="rounded-3xl border border-sky-100/80 bg-white/60 p-6 shadow-sm backdrop-blur dark:border-sky-800/70 dark:bg-slate-950/30">
        <h3 className="text-base font-semibold tracking-tight">Leave a review</h3>
        <p className="mt-1 text-xs text-slate-900/70 dark:text-slate-100/70">
          Your feedback helps more people discover Givio Cards.
        </p>

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

          <label className="space-y-1 block">
            <span className="text-xs font-medium text-slate-900/80 dark:text-slate-100/80">
              Rating
            </span>
            <select
              value={submitRating}
              onChange={(e) => setSubmitRating(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:ring focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
            >
              <option value={5}>5</option>
              <option value={4}>4</option>
              <option value={3}>3</option>
              <option value={2}>2</option>
              <option value={1}>1</option>
            </select>
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
              <p className="text-xs text-red-600 dark:text-red-400">{submitError}</p>
            ) : null}
          </div>
        </form>
      </div>
    </section>
  );
}