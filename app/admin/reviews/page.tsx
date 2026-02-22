"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type ReviewRow = {
  id: string;
  created_at: string;
  name: string | null;
  rating: number | null;
  title: string | null;
  body: string;
  source: string | null;
  is_approved: boolean;
  is_in_rotation: boolean;
};

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/reviews", { cache: "no-store" });
      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        setError(json?.error || "Failed to load reviews");
        setReviews([]);
        return;
      }

      setReviews(Array.isArray(json.reviews) ? (json.reviews as ReviewRow[]) : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const countInRotation = useMemo(
    () => reviews.filter((r) => r.is_in_rotation).length,
    [reviews],
  );

  async function patch(id: string, patchBody: Partial<ReviewRow>) {
    const res = await fetch("/api/admin/reviews", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patchBody }),
    });

    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) {
      throw new Error(json?.error || "Update failed");
    }
  }

  async function toggleApproved(r: ReviewRow) {
    try {
      await patch(r.id, { is_approved: !r.is_approved });
      await load();
    } catch (e: any) {
      setError(e?.message || "Update failed");
    }
  }

  async function toggleRotation(r: ReviewRow) {
    try {
      await patch(r.id, { is_in_rotation: !r.is_in_rotation });
      await load();
    } catch (e: any) {
      setError(e?.message || "Update failed");
    }
  }

  async function remove(id: string) {
    try {
      const res = await fetch(`/api/admin/reviews?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        setError(json?.error || "Delete failed");
        return;
      }

      await load();
    } catch {
      setError("Delete failed");
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-10 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <main className="mx-auto w-full max-w-6xl space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Admin control center
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">Reviews</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Approve reviews and choose which ones appear on the homepage. In rotation:{" "}
              {countInRotation}
            </p>
          </div>

          <Link
            href="/admin"
            className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            Back to admin
          </Link>
        </header>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        ) : null}

        <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-200 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
            {loading ? "Loading reviews..." : `${reviews.length} total`}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Rating</th>
                  <th className="px-4 py-3">Review</th>
                  <th className="px-4 py-3">Approved</th>
                  <th className="px-4 py-3">In rotation</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {reviews.map((r) => (
                  <tr key={r.id} className="align-top">
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-zinc-500 dark:text-zinc-400">
                      {new Date(r.created_at).toLocaleString()}
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-medium">{r.name || "Anonymous"}</div>
                      {r.title ? (
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                          {r.title}
                        </div>
                      ) : null}
                      {r.source ? (
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                          Source: {r.source}
                        </div>
                      ) : null}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">{r.rating ?? ""}</td>

                    <td className="px-4 py-3">
                      <div className="max-w-xl whitespace-pre-wrap text-zinc-800 dark:text-zinc-100">
                        {r.body}
                      </div>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => toggleApproved(r)}
                        className={[
                          "rounded-full px-3 py-1 text-xs font-medium",
                          r.is_approved
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                            : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
                        ].join(" ")}
                      >
                        {r.is_approved ? "Approved" : "Not approved"}
                      </button>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <label className="inline-flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={r.is_in_rotation}
                          onChange={() => toggleRotation(r)}
                        />
                        Featured
                      </label>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => remove(r.id)}
                        className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}

                {!loading && reviews.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-sm text-zinc-600 dark:text-zinc-400"
                    >
                      No reviews yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}