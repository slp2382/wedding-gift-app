"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type DiscountType = "percent" | "fixed" | "partner_tiered_unit_price";

type PartnerTier = {
  min_qty: number;
  max_qty: number | null;
  unit_price_cents: number;
};

type DiscountCodeRow = {
  id: string;
  code: string;
  active: boolean;
  discount_type: DiscountType;
  discount_value: number | null;
  valid_from: string | null;
  valid_to: string | null;
  max_redemptions: number | null;
  redemption_count: number;
  min_subtotal_cents: number | null;
  notes: string | null;
  stripe_coupon_id: string | null;
  created_at: string;

  partner_moq?: number | null;
  partner_tiers?: PartnerTier[] | null;
};

type FormState = {
  id?: string;
  code: string;
  active: boolean;
  discount_type: DiscountType;

  // standard discount
  discount_value: string;

  // partner discount
  partner_moq: string;
  partner_tiers: PartnerTier[];

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

function parseRequiredInt(v: string) {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function defaultPartnerTiers(): PartnerTier[] {
  return [
    { min_qty: 25, max_qty: 49, unit_price_cents: 350 },
    { min_qty: 50, max_qty: 99, unit_price_cents: 300 },
    { min_qty: 100, max_qty: 199, unit_price_cents: 275 },
    { min_qty: 200, max_qty: null, unit_price_cents: 250 },
  ];
}

function normalizeTiers(tiers: PartnerTier[]) {
  const cleaned = tiers
    .map((t) => ({
      min_qty: Math.max(1, Math.trunc(Number(t.min_qty))),
      max_qty:
        t.max_qty === null || t.max_qty === undefined || String(t.max_qty) === ""
          ? null
          : Math.trunc(Number(t.max_qty)),
      unit_price_cents: Math.max(1, Math.trunc(Number(t.unit_price_cents))),
    }))
    .filter((t) => Number.isFinite(t.min_qty) && Number.isFinite(t.unit_price_cents));

  cleaned.sort((a, b) => a.min_qty - b.min_qty);
  return cleaned;
}

function tierSummary(tiers: PartnerTier[] | null | undefined) {
  if (!tiers || tiers.length === 0) return "No tiers";
  const parts = tiers.slice(0, 3).map((t) => {
    const maxLabel = t.max_qty == null ? "+" : `to ${t.max_qty}`;
    return `${t.min_qty} ${maxLabel} at ${formatCents(t.unit_price_cents)}`;
  });
  return parts.join(", ") + (tiers.length > 3 ? ", more" : "");
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
    discount_value: "10",
    partner_moq: "25",
    partner_tiers: defaultPartnerTiers(),
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
      discount_value: "10",
      partner_moq: "25",
      partner_tiers: defaultPartnerTiers(),
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
      discount_value:
        r.discount_type === "partner_tiered_unit_price"
          ? ""
          : String(Number(r.discount_value || 0)),
      partner_moq: String(Number(r.partner_moq ?? 25)),
      partner_tiers:
        Array.isArray(r.partner_tiers) && r.partner_tiers.length > 0
          ? r.partner_tiers
          : defaultPartnerTiers(),
      valid_from: isoInputValue(r.valid_from),
      valid_to: isoInputValue(r.valid_to),
      max_redemptions: r.max_redemptions == null ? "" : String(r.max_redemptions),
      min_subtotal_cents:
        r.min_subtotal_cents == null ? "" : String(r.min_subtotal_cents),
      notes: r.notes ?? "",
    });
    setShowModal(true);
  }

  function clientValidate(): string | null {
    const code = form.code.trim();
    if (!code) return "Code is required.";

    if (form.discount_type === "percent") {
      const n = parseRequiredInt(form.discount_value);
      if (n == null) return "Percent discount value is required.";
      if (n < 1 || n > 100) return "Percent must be between 1 and 100.";
      return null;
    }

    if (form.discount_type === "fixed") {
      const n = parseRequiredInt(form.discount_value);
      if (n == null) return "Fixed discount value is required.";
      if (n < 1) return "Fixed discount must be at least 1 cent.";
      return null;
    }

    // partner tier
    const moq = parseRequiredInt(form.partner_moq);
    if (moq == null) return "Partner MOQ is required.";
    if (moq < 1) return "Partner MOQ must be at least 1.";

    const tiers = normalizeTiers(form.partner_tiers);
    if (tiers.length === 0) return "Partner tiers are required.";

    if (
      !tiers.some(
        (t) => moq >= t.min_qty && (t.max_qty == null || moq <= t.max_qty),
      )
    ) {
      return "Partner MOQ does not fit into any tier range.";
    }

    return null;
  }

  async function save() {
    try {
      setSaving(true);
      setError(null);

      const validationError = clientValidate();
      if (validationError) {
        setSaving(false);
        setError(validationError);
        return;
      }

      const payload: Record<string, unknown> = {
        id: form.id,
        code: form.code,
        active: form.active,
        discount_type: form.discount_type,
        valid_from: form.valid_from ? new Date(form.valid_from).toISOString() : null,
        valid_to: form.valid_to ? new Date(form.valid_to).toISOString() : null,
        max_redemptions: parseNullableInt(form.max_redemptions),
        min_subtotal_cents: parseNullableInt(form.min_subtotal_cents),
        notes: form.notes.trim() ? form.notes.trim() : null,
      };

      if (form.discount_type === "partner_tiered_unit_price") {
        payload.discount_value = null;
        payload.partner_moq = parseRequiredInt(form.partner_moq) ?? 25;
        payload.partner_tiers = normalizeTiers(form.partner_tiers);
      } else {
        payload.discount_value = Math.trunc(Number(form.discount_value));
        payload.partner_moq = null;
        payload.partner_tiers = null;
      }

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

  const isPartner = form.discount_type === "partner_tiered_unit_price";

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-10 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              GiftLink admin
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">Discount codes</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Manage codes used at checkout. Discounts apply to product subtotal only, not shipping.
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
                    <th className="px-4 py-3">Type</th>
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
                        {r.discount_type === "partner_tiered_unit_price"
                          ? "Partner tier"
                          : r.discount_type === "percent"
                            ? "Percent"
                            : "Fixed"}
                      </td>

                      <td className="px-4 py-3">
                        {r.discount_type === "partner_tiered_unit_price" ? (
                          <div>
                            <div className="font-medium">MOQ {r.partner_moq ?? 25}</div>
                            <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                              {tierSummary(r.partner_tiers)}
                            </div>
                          </div>
                        ) : r.discount_type === "percent" ? (
                          `${Number(r.discount_value || 0)}%`
                        ) : (
                          formatCents(Number(r.discount_value || 0))
                        )}
                      </td>

                      <td className="px-4 py-3 text-xs text-zinc-600 dark:text-zinc-400">
                        <div>
                          From{" "}
                          {r.valid_from ? new Date(r.valid_from).toLocaleString() : "Any"}
                        </div>
                        <div>
                          To{" "}
                          {r.valid_to ? new Date(r.valid_to).toLocaleString() : "Any"}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        {r.min_subtotal_cents == null ? "None" : formatCents(r.min_subtotal_cents)}
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
            <div className="w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
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
                    onChange={(e) => {
                      const v = e.target.value as DiscountType;
                      setForm((s) => {
                        const next: FormState = { ...s, discount_type: v };
                        if (v === "partner_tiered_unit_price") {
                          next.discount_value = "";
                          if (!next.partner_moq) next.partner_moq = "25";
                          if (!next.partner_tiers || next.partner_tiers.length === 0) {
                            next.partner_tiers = defaultPartnerTiers();
                          }
                        } else {
                          if (!next.discount_value) {
                            next.discount_value = v === "percent" ? "10" : "200";
                          }
                        }
                        return next;
                      });
                    }}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-indigo-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                  >
                    <option value="percent">Percent</option>
                    <option value="fixed">Fixed amount in cents</option>
                    <option value="partner_tiered_unit_price">Partner tiered unit price</option>
                  </select>
                </div>

                {!isPartner ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Discount value</label>
                    <input
                      type="number"
                      value={form.discount_value}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, discount_value: e.target.value }))
                      }
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-indigo-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                      min={1}
                    />
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      Percent example 10 means 10 percent. Fixed example 200 means 2 dollars.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Partner MOQ</label>
                    <input
                      type="number"
                      value={form.partner_moq}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, partner_moq: e.target.value }))
                      }
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-indigo-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                      min={1}
                    />
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      Checkout will reject carts below MOQ for this code.
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium">Valid from</label>
                  <input
                    type="datetime-local"
                    value={form.valid_from}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, valid_from: e.target.value }))
                    }
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-indigo-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Valid to</label>
                  <input
                    type="datetime-local"
                    value={form.valid_to}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, valid_to: e.target.value }))
                    }
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

                {isPartner && (
                  <div className="space-y-2 md:col-span-2">
                    <div className="flex items-end justify-between gap-3">
                      <label className="text-sm font-medium">Partner tiers</label>
                      <button
                        type="button"
                        onClick={() =>
                          setForm((s) => ({
                            ...s,
                            partner_tiers: [
                              ...s.partner_tiers,
                              { min_qty: 1, max_qty: null, unit_price_cents: 1 },
                            ],
                          }))
                        }
                        className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
                        disabled={saving}
                      >
                        Add tier
                      </button>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-950/40 dark:text-zinc-400">
                          <tr className="border-b border-zinc-200 dark:border-zinc-800">
                            <th className="px-3 py-2">Min qty</th>
                            <th className="px-3 py-2">Max qty</th>
                            <th className="px-3 py-2">Unit price cents</th>
                            <th className="px-3 py-2 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {form.partner_tiers.map((t, idx) => (
                            <tr
                              key={`${idx}-${t.min_qty}-${t.unit_price_cents}`}
                              className="border-b border-zinc-200 last:border-0 dark:border-zinc-800"
                            >
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  value={t.min_qty}
                                  min={1}
                                  onChange={(e) => {
                                    const v = Number(e.target.value);
                                    setForm((s) => {
                                      const next = [...s.partner_tiers];
                                      next[idx] = { ...next[idx], min_qty: v };
                                      return { ...s, partner_tiers: next };
                                    });
                                  }}
                                  className="w-28 rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 shadow-sm outline-none focus:border-indigo-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  value={t.max_qty ?? ""}
                                  min={1}
                                  placeholder="Blank means no max"
                                  onChange={(e) => {
                                    const raw = e.target.value.trim();
                                    const v = raw ? Number(raw) : null;
                                    setForm((s) => {
                                      const next = [...s.partner_tiers];
                                      next[idx] = { ...next[idx], max_qty: v };
                                      return { ...s, partner_tiers: next };
                                    });
                                  }}
                                  className="w-40 rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 shadow-sm outline-none focus:border-indigo-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  value={t.unit_price_cents}
                                  min={1}
                                  onChange={(e) => {
                                    const v = Number(e.target.value);
                                    setForm((s) => {
                                      const next = [...s.partner_tiers];
                                      next[idx] = { ...next[idx], unit_price_cents: v };
                                      return { ...s, partner_tiers: next };
                                    });
                                  }}
                                  className="w-40 rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 shadow-sm outline-none focus:border-indigo-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                                />
                              </td>
                              <td className="px-3 py-2 text-right">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setForm((s) => ({
                                      ...s,
                                      partner_tiers: s.partner_tiers.filter((_, i) => i !== idx),
                                    }))
                                  }
                                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-800 shadow-sm transition hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100 dark:hover:bg-red-950/60"
                                  disabled={saving || form.partner_tiers.length <= 1}
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      Tiers are matched by total cart quantity. Checkout applies an amount off discount so the effective unit price matches the tier.
                    </p>
                  </div>
                )}

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
