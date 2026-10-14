"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Plan = {
  id: string;
  name: string;
  description: string | null;
  monthlyPriceCents: number;
  projectLimit: number;
  isActive: boolean;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value / 100);
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [subscribingId, setSubscribingId] = useState<string | null>(null);

  useEffect(() => {
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

    loadPlans();
  }, []);

  async function handleSubscribe(planId: string) {
    setError("");
    setSubscribingId(planId);

    try {
      const response = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });

      const payload = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }

        throw new Error(payload.error ?? "Unable to subscribe.");
      }

      window.location.href = "/dashboard";
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to create subscription.",
      );
    } finally {
      setSubscribingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-50">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">Pricing</p>
            <h1 className="mt-2 text-4xl font-black">Choose the right plan</h1>
          </div>
          <Link
            href="/login"
            className="rounded-full border border-slate-700 px-4 py-2 text-sm font-medium text-white transition hover:border-cyan-400 hover:text-cyan-300"
          >
            Sign in
          </Link>
        </div>

        {error ? (
          <div className="mb-6 rounded-2xl border border-rose-500/50 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-80 animate-pulse rounded-3xl border border-slate-800 bg-slate-900" />
            ))}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`rounded-3xl border p-6 ${
                  plan.name === "Pro"
                    ? "border-cyan-500/60 bg-cyan-500/10 shadow-xl shadow-cyan-900/20"
                    : "border-slate-800 bg-slate-900"
                }`}
              >
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="text-2xl font-bold">{plan.name}</h2>
                  {plan.name === "Pro" ? (
                    <span className="rounded-full bg-cyan-500/15 px-2 py-1 text-xs font-medium text-cyan-300">
                      Popular
                    </span>
                  ) : null}
                </div>

                <div className="mb-4 flex items-end gap-2">
                  <span className="text-4xl font-black">{formatMoney(plan.monthlyPriceCents)}</span>
                  <span className="pb-1 text-sm text-slate-400">/ month</span>
                </div>

                <p className="min-h-12 text-sm text-slate-300">
                  {plan.description ?? "Flexible access for your next project set."}
                </p>

                <div className="my-6 rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-slate-300">
                  Up to {plan.projectLimit} projects included
                </div>

                <button
                  type="button"
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={subscribingId !== null}
                  className="w-full rounded-xl bg-cyan-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {subscribingId === plan.id ? "Processing..." : "Choose plan"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
