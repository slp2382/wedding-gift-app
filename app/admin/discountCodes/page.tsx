"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type DiscountCodeRow = {
  id: string;
  code: string;
  active: boolean;
  discount_type: "percent" | "fixed";
  discount_value: number;
  valid_from: string | null;
  valid_to: string | null;
  max_redemptions: number | null;
  redemption_count: number;
  min_subtotal_cents: number | null;
  notes: string | null;
  stripe_coupon_id: string | null;
  created_at: string;
};

type FormState = {
  id?: string;
  code: string;
  active: boolean;
  discount_type: "percent" | "fixed";
  discount_value: number;
  valid_from: string;
  valid_to: string;
  max_redemptions: string;
  min_subtotal_cents: string;
  notes: string;
};

function isoInputValue(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

function parseNullableInt(v: string) {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

export default function AdminDiscountCodesPage() {
  const [rows, setRows] = useState<DiscountCodeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<FormState>({
    code: "",
    active: true,
    discount_type: "percent",
    discount_value: 10,
    valid_from: "",
    valid_to: "",
    max_redemptions: "",
    min_subtotal_cents: "",
    notes: "",
  });

  async function refresh() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/discount-codes", { method: "GET" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError((data && data.error) || "Failed to load discount codes.");
        setLoading(false);
        return;
      }
      setRows(Array.isArray(data?.rows) ? data.rows : []);
      setLoading(false);
    } catch (e) {
      console.error(e);
      setError("Failed to load discount codes.");
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const stats = useMemo(() => {
    const activeCount = rows.filter((r) => r.active).length;
    return { total: rows.length, active: activeCount };
  }, [rows]);

  function openCreate() {
    setForm({
      code: "",
      active: true,
      discount_type: "percent",
      discount_value: 10,
      valid_from: "",
      valid_to: "",
      max_redemptions: "",
      min_subtotal_cents: "",
      notes: "",
    });
    setShowModal(true);
  }

  function openEdit(r: DiscountCodeRow) {
    setForm({
      id: r.id,
      code: r.code ?? "",
      active: !!r.active,
      discount_type: r.discount_type,
      discount_value: Number(r.discount_value || 0),
      valid_from: isoInputValue(r.valid_from),
      valid_to: isoInputValue(r.valid_to),
      max_redemptions: r.max_redemptions == null ? "" : String(r.max_redemptions),
      min_subtotal_cents:
        r.min_subtotal_cents == null ? "" : String(r.min_subtotal_cents),
      notes: r.notes ?? "",
    });
    setShowModal(true);
  }

  async function save() {
    try {
      setSaving(true);
      setError(null);

      const payload = {
        id: form.id,
        code: form.code,
        active: form.active,
        discount_type: form.discount_type,
        discount_value: Math.trunc(Number(form.discount_value)),
        valid_from: form.valid_from ? new Date(form.valid_from).toISOString() : null,
        valid_to: form.valid_to ? new Date(form.valid_to).toISOString() : null,
        max_redemptions: parseNullableInt(form.max_redemptions),
        min_subtotal_cents: parseNullableInt(form.min_subtotal_cents),
        notes: form.notes.trim() ? form.notes.trim() : null,
      };

      const method = form.id ? "PATCH" : "POST";
      const res = await fetch("/api/admin/discount-codes", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError((data && data.error) || "Failed to save discount code.");
        setSaving(false);
        return;
      }

      setShowModal(false);
      setSaving(false);
      await refresh();
    } catch (e) {
      console.error(e);
      setError("Failed to save discount code.");
      setSaving(false);
    }
  }

  async function toggleActive(r: DiscountCodeRow) {
    try {
      setSaving(true);
      setError(null);
      const res = await fetch("/api/admin/discount-codes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: r.id, active: !r.active }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError((data && data.error) || "Failed to update discount code.");
        setSaving(false);
        return;
      }
      setSaving(false);
      await refresh();
    } catch (e) {
      console.error(e);
      setError("Failed to update discount code.");
      setSaving(false);
    }
  }

  async function remove(r: DiscountCodeRow) {
    const ok = window.confirm(`Delete code ${r.code}? This cannot be undone.`);
    if (!ok) return;

    try {
      setSaving(true);
      setError(null);
      const res = await fetch("/api/admin/discount-codes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: r.id }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError((data && data.error) || "Failed to delete discount code.");
        setSaving(false);
        return;
      }
      setSaving(false);
      await refresh();
    } catch (e) {
      console.error(e);
      setError("Failed to delete discount code.");
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-10 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              GiftLink admin
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
              Discount codes
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Manage codes used at checkout. Discounts apply to product subtotal
              only, not shipping.
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Total {stats.total} · Active {stats.active}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="inline-flex items-center rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
            >
              Back
            </Link>
            <button
              onClick={openCreate}
              className="inline-flex items-center rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
              disabled={saving}
            >
              New code
            </button>
          </div>
        </header>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
            {error}
          </div>
        )}

        <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-200 px-4 py-3 text-sm font-semibold dark:border-zinc-800">
            Codes
          </div>

          {loading ? (
            <div className="px-4 py-10 text-center text-sm text-zinc-600 dark:text-zinc-400">
              Loading…
            </div>
          ) : rows.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-zinc-600 dark:text-zinc-400">
              No discount codes yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  <tr className="border-b border-zinc-200 dark:border-zinc-800">
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Discount</th>
                    <th className="px-4 py-3">Window</th>
                    <th className="px-4 py-3">Min subtotal</th>
                    <th className="px-4 py-3">Redemptions</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-zinc-200 last:border-0 dark:border-zinc-800"
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold">{r.code}</div>
                        {r.notes ? (
                          <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                            {r.notes}
                          </div>
                        ) : null}
                      </td>

                      <td className="px-4 py-3">
                        {r.active ? (
                          <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-medium text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-200">
                            Disabled
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {r.discount_type === "percent"
                          ? `${r.discount_value}%`
                          : `$${(r.discount_value / 100).toFixed(2)}`}
                      </td>

                      <td className="px-4 py-3 text-xs text-zinc-600 dark:text-zinc-400">
                        <div>
                          From {r.valid_from ? new Date(r.valid_from).toLocaleString() : "Any"}
                        </div>
                        <div>
                          To {r.valid_to ? new Date(r.valid_to).toLocaleString() : "Any"}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        {r.min_subtotal_cents == null
                          ? "None"
                          : `$${(r.min_subtotal_cents / 100).toFixed(2)}`}
                      </td>

                      <td className="px-4 py-3">
                        {r.max_redemptions == null
                          ? `${r.redemption_count}`
                          : `${r.redemption_count} / ${r.max_redemptions}`}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEdit(r)}
                            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
                            disabled={saving}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => toggleActive(r)}
                            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
                            disabled={saving}
                          >
                            {r.active ? "Disable" : "Enable"}
                          </button>
                          <button
                            onClick={() => remove(r)}
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-800 shadow-sm transition hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100 dark:hover:bg-red-950/60"
                            disabled={saving}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">
                    {form.id ? "Edit discount code" : "Create discount code"}
                  </h2>
                  <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                    Codes are normalized by your database trigger. Percent must be 1 to 100.
                  </p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
                  disabled={saving}
                >
                  Close
                </button>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Code</label>
                  <input
                    value={form.code}
                    onChange={(e) => setForm((s) => ({ ...s, code: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-indigo-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                    placeholder="SAVE10"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Active</label>
                  <select
                    value={form.active ? "true" : "false"}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, active: e.target.value === "true" }))
                    }
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-indigo-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                  >
                    <option value="true">Active</option>
                    <option value="false">Disabled</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Discount type</label>
                  <select
                    value={form.discount_type}
                    onChange={(e) =>
                      setForm((s) => ({
                        ...s,
                        discount_type: e.target.value as "percent" | "fixed",
                      }))
                    }
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-indigo-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                  >
                    <option value="percent">Percent</option>
                    <option value="fixed">Fixed amount in cents</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Discount value</label>
                  <input
                    type="number"
                    value={form.discount_value}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, discount_value: Number(e.target.value) }))
                    }
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-indigo-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                    min={1}
                  />
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    Percent example 10 means 10 percent. Fixed example 200 means 2 dollars.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Valid from</label>
                  <input
                    type="datetime-local"
                    value={form.valid_from}
                    onChange={(e) => setForm((s) => ({ ...s, valid_from: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-indigo-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Valid to</label>
                  <input
                    type="datetime-local"
                    value={form.valid_to}
                    onChange={(e) => setForm((s) => ({ ...s, valid_to: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-indigo-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Max redemptions</label>
                  <input
                    value={form.max_redemptions}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, max_redemptions: e.target.value }))
                    }
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-indigo-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                    placeholder="Leave blank for unlimited"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Min subtotal cents</label>
                  <input
                    value={form.min_subtotal_cents}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, min_subtotal_cents: e.target.value }))
                    }
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-indigo-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                    placeholder="Example 1500 means 15 dollars"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Notes</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
                    className="min-h-[90px] w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-indigo-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                    placeholder="Internal notes, optional"
                  />
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  onClick={save}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
