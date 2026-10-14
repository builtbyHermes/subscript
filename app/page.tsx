import Link from "next/link";

const metrics = [
  { label: "Projects tracked", value: "12k+" },
  { label: "Active teams", value: "940" },
  { label: "Avg. retention", value: "94%" },
];

const highlights = [
  "Unlimited billing visibility",
  "Subscription-aware project limits",
  "Admin controls and usage dashboards",
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="mb-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500 font-bold text-slate-950">
              S
            </div>
            <div>
              <div className="text-lg font-semibold">Subscript</div>
            </div>
          </div>

          <nav className="flex items-center gap-4 text-sm text-slate-300">
            <Link href="/plans" className="transition hover:text-white">
              Plans
            </Link>
            <Link href="/dashboard" className="transition hover:text-white">
              Dashboard
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-slate-700 px-4 py-2 font-medium text-white transition hover:border-cyan-400 hover:text-cyan-300"
            >
              Sign in
            </Link>
          </nav>
        </header>

        <section className="grid items-center gap-10 pb-20 pt-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="mb-5 inline-flex items-center rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-cyan-300">
              Subscription management
            </div>
            <h1 className="max-w-xl text-5xl font-black tracking-tight text-white sm:text-6xl">
              Grow revenue with cleaner subscription workflows.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-slate-300">
              Manage plans, subscriptions, usage limits, and team projects in one place without touching the backend.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/plans"
                className="rounded-full bg-cyan-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400"
              >
                View plans
              </Link>
              <Link
                href="/register"
                className="rounded-full border border-slate-700 px-6 py-3 font-semibold text-white transition hover:border-slate-500 hover:bg-slate-900"
              >
                Create account
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-cyan-900/20">
            <div className="rounded-2xl border border-slate-700 bg-slate-950 p-5">
              <div className="mb-4 flex items-center justify-between text-sm text-slate-300">
                <span>Current subscription</span>
                <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-medium text-emerald-300">
                  Active
                </span>
              </div>

              <div className="mb-6 flex items-end gap-3">
                <span className="text-4xl font-bold">$49</span>
                <span className="pb-1 text-slate-400">/ month</span>
              </div>

              <div className="space-y-4">
                {highlights.map((item) => (
                  <div key={item} className="flex items-center gap-3 text-sm text-slate-200">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500 text-xs font-bold text-slate-950">
                      ✓
                    </span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 border-t border-slate-800 py-12 md:grid-cols-3">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <div className="text-3xl font-black text-white">{metric.value}</div>
              <div className="mt-2 text-sm text-slate-400">{metric.label}</div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
