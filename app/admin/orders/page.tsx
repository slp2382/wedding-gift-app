"use client";

import { useEffect, useState } from "react";

interface PrintJob {
  id: string;
  created_at: string;
  card_id: string;
  order_id: string | null;
  pdf_path: string | null;
  status: string;
  error_message: string | null;
  printful_order_id: string | null;
  printful_status: string | null;
}

export default function AdminOrdersPage() {
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    async function fetchJobs() {
      try {
        const response = await fetch("/api/admin/orders");
        const data = await response.json();
        setJobs(data.jobs ?? []);
      } catch (err) {
        console.error("Failed to fetch admin orders:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchJobs();
  }, []);

  async function markShipped(id: string) {
    try {
      await fetch("/api/admin/orders/updateFulfillment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: id }),
      });

      // Refresh page state
      setJobs((prev) =>
        prev.map((job) =>
          job.id === id ? { ...job, status: "shipped" } : job
        )
      );
    } catch (err) {
      console.error("Failed to mark shipped:", err);
    }
  }

  function filteredJobs() {
    if (filter === "all") return jobs;
    return jobs.filter((job) => job.status === filter);
  }

  if (loading) {
    return (
      <div className="p-6 text-zinc-700 dark:text-zinc-300">Loading orders…</div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Card pack orders</h1>

      {/* Filters */}
      <div className="flex gap-3 text-sm">
        {["all", "pending", "processing", "shipped", "error"].map((key) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`rounded-lg px-3 py-1 border ${
              filter === key
                ? "bg-zinc-900 text-white dark:bg-zinc-200 dark:text-zinc-900"
                : "bg-white text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
            }`}
          >
            {key.charAt(0).toUpperCase() + key.slice(1)}
          </button>
        ))}
      </div>

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Showing {filteredJobs().length} of {jobs.length} print jobs
      </p>

      {/* Orders Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800 text-sm">
          <thead>
            <tr className="bg-zinc-100 dark:bg-zinc-900">
              <th className="px-3 py-2 text-left font-medium">Created</th>
              <th className="px-3 py-2 text-left font-medium">Card</th>
              <th className="px-3 py-2 text-left font-medium">Customer</th>
              <th className="px-3 py-2 text-left font-medium">Payment</th>
              <th className="px-3 py-2 text-left font-medium">Fulfillment</th>
              <th className="px-3 py-2 text-left font-medium">Printful</th>
              <th className="px-3 py-2 text-left font-medium">Links</th>
              <th className="px-3 py-2 text-left font-medium">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {filteredJobs().map((job) => (
              <tr key={job.id}>
                <td className="px-3 py-3 whitespace-nowrap">
                  {new Date(job.created_at).toLocaleString()}
                  <div className="text-xs text-zinc-500">Job {job.id}</div>
                </td>

                <td className="px-3 py-3 whitespace-nowrap">{job.card_id}</td>

                <td className="px-3 py-3 whitespace-nowrap">
                  <div className="text-sm font-medium">Scott Porter</div>
                  <div className="text-xs text-zinc-500">
                    Charlotte NC 28203
                  </div>
                </td>

                <td className="px-3 py-3 whitespace-nowrap">
                  <span className="rounded-md bg-green-100 px-2 py-1 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs">
                    paid
                  </span>
                </td>

                <td className="px-3 py-3 whitespace-nowrap">{job.status}</td>

                <td className="px-3 py-3 whitespace-nowrap">
                  {job.printful_status ?? "-"}
                </td>

                <td className="px-3 py-3 whitespace-nowrap text-blue-600">
                  {/* Print file link */}
                  {job.pdf_path ? (
                    <a
                      href={`https://vxtvjcdaugslqcdokllf.supabase.co/storage/v1/object/public/printfiles/${job.pdf_path}`}
                      target="_blank"
                      className="block hover:underline"
                    >
                      Print file
                    </a>
                  ) : (
                    "-"
                  )}

                  {/* Updated Printful link */}
                  {job.printful_order_id ? (
                    <a
                      href="https://www.printful.com/dashboard/default/orders"
                      target="_blank"
                      className="block hover:underline"
                    >
                      Printful order
                    </a>
                  ) : (
                    "-"
                  )}
                </td>

                <td className="px-3 py-3 whitespace-nowrap">
                  {job.status !== "shipped" ? (
                    <button
                      onClick={() => markShipped(job.id)}
                      className="rounded-md bg-zinc-900 px-3 py-1 text-white text-xs hover:bg-zinc-800 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
                    >
                      Mark shipped
                    </button>
                  ) : (
                    <span className="text-xs text-zinc-500">Shipped</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
