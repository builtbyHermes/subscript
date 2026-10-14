"use client";

import { FormEvent, useEffect, useState } from "react";

type Plan = {
  id: string;
  name: string;
  description: string | null;
  monthlyPriceCents: number;
  projectLimit: number;
  isActive: boolean;
};

const emptyForm = {
  name: "",
  description: "",
  monthlyPriceCents: "49",
  projectLimit: "5",
  isActive: true,
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value / 100);
}

export default function AdminPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadPlans() {
    try {
      const response = await fetch("/api/plans");
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load plans.");
      }

      setPlans(payload.plans ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Unable to load plans.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPlans();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    try {
      const response = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
          monthlyPriceCents: Number(form.monthlyPriceCents),
          projectLimit: Number(form.projectLimit),
          isActive: form.isActive,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to create plan.");
      }

      setForm(emptyForm);
      await loadPlans();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to create plan.",
      );
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">Admin</p>
          <h1 className="mt-2 text-4xl font-black">Plan management</h1>
        </div>

        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-5 text-2xl font-bold">Create new plan</h2>

            <div className="space-y-5">
              <label className="block text-sm text-slate-300">
                <span className="mb-2 block">Plan name</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none transition focus:border-cyan-400"
                  required
                />
              </label>

              <label className="block text-sm text-slate-300">
                <span className="mb-2 block">Description</span>
                <textarea
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, description: event.target.value }))
                  }
                  className="min-h-24 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none transition focus:border-cyan-400"
                />
              </label>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block text-sm text-slate-300">
                  <span className="mb-2 block">Price (cents)</span>
                  <input
                    type="number"
                    min={0}
                    value={form.monthlyPriceCents}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, monthlyPriceCents: event.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none transition focus:border-cyan-400"
                    required
                  />
                </label>

                <label className="block text-sm text-slate-300">
                  <span className="mb-2 block">Project limit</span>
                  <input
                    type="number"
                    min={1}
                    value={form.projectLimit}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, projectLimit: event.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none transition focus:border-cyan-400"
                    required
                  />
                </label>
              </div>

              <label className="flex items-center gap-3 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, isActive: event.target.checked }))
                  }
                  className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-cyan-500"
                />
                Active
              </label>

              {error ? (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                className="w-full rounded-xl bg-cyan-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400"
              >
                Save plan
              </button>
            </div>
          </form>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-5 text-2xl font-bold">Existing plans</h2>

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-20 animate-pulse rounded-2xl border border-slate-800 bg-slate-950" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {plans.map((plan) => (
                  <div key={plan.id} className="rounded-2xl border border-slate-700 bg-slate-950 p-4">
                    <div className="mb-2 flex items-center justify-between gap-4">
                      <h3 className="text-lg font-semibold">{plan.name}</h3>
                      <span className="rounded-full bg-slate-800 px-2 py-1 text-xs uppercase tracking-wide text-slate-300">
                        {plan.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300">{plan.description ?? "No description available"}</p>
                    <div className="mt-3 flex items-center justify-between text-sm text-slate-400">
                      <span>{formatMoney(plan.monthlyPriceCents)}</span>
                      <span>{plan.projectLimit} projects</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
