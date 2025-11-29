export default function AdminLoginPage({
  searchParams,
}: {
  searchParams?: { next?: string; error?: string };
}) {
  const next =
    typeof searchParams?.next === "string" && searchParams.next.startsWith("/admin")
      ? searchParams.next
      : "/admin";

  const showError = searchParams?.error === "1";

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-10 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <main className="mx-auto w-full max-w-md">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            GiftLink admin
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            Sign in
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Enter the admin password to continue.
          </p>

          {showError && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
              Incorrect password.
            </div>
          )}

          <form className="mt-6 space-y-4" method="post" action="/api/admin/login">
            <input type="hidden" name="next" value={next} />

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none ring-0 focus:border-indigo-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              />
            </div>

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              Sign in
            </button>
          </form>

          <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
            Tip: set ADMIN_PASSWORD and ADMIN_SESSION_SECRET in your env vars.
          </p>
        </div>
      </main>
    </div>
  );
}
