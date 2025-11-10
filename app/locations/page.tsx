"use client";

import { useState } from "react";

export default function LocationsPage() {
  const [zip, setZip] = useState("");
  const [radius, setRadius] = useState("25");
  const [submittedZip, setSubmittedZip] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!zip.trim()) return;
    setSubmittedZip(zip.trim());
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 px-4 py-10 dark:bg-zinc-950 dark:text-zinc-50">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <header className="space-y-3">
          <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
            Retail finder
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Find stores that carry GiftLink Cards
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Soon you will be able to search by ZIP code to discover nearby
            shops and card aisles that sell GiftLink Cards. For now this page
            is a preview of the experience.
          </p>
        </header>

        <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-base font-medium">Search by ZIP code</h2>
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-3 md:flex-row md:items-center"
          >
            <div className="flex-1">
              <label
                htmlFor="zip"
                className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500"
              >
                ZIP code
              </label>
              <input
                id="zip"
                type="text"
                inputMode="numeric"
                pattern="\d*"
                maxLength={10}
                value={zip}
                onChange={(event) => setZip(event.target.value)}
                placeholder="Enter ZIP code  for example 28203"
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-0 transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>

            <div className="md:w-40">
              <label
                htmlFor="radius"
                className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500"
              >
                Radius
              </label>
              <select
                id="radius"
                value={radius}
                onChange={(event) => setRadius(event.target.value)}
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-0 transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value="10">Within 10 miles</option>
                <option value="25">Within 25 miles</option>
                <option value="50">Within 50 miles</option>
              </select>
            </div>

            <button
              type="submit"
              className="mt-1 inline-flex items-center justify-center rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 md:mt-6 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Check availability
            </button>
          </form>

          <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-400">
            {submittedZip ? (
              <p>
                Location search is not live yet. When this feature launches we
                will show GiftLink retail partners within about {radius} miles
                of <span className="font-mono">{submittedZip}</span>.
              </p>
            ) : (
              <p>
                Type a ZIP code and radius, then press Check availability to see
                how the future experience will look. Store data is still coming
                together behind the scenes.
              </p>
            )}
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-base font-medium">For retailers</h2>
          <p className="text-zinc-600 dark:text-zinc-400">
            If you run a card shop, boutique or bookstore and want to stock
            GiftLink Cards, this page will soon include a quick way to register
            your interest and appear in the map.
          </p>
        </section>
      </main>
    </div>
  );
}
