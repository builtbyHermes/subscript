"use client";

import { useEffect, useState } from "react";

type PaymentRecord = {
  id: string;
  amountCents: number;
  method: "SIMULATED" | "MANUAL";
  status: "PENDING" | "APPROVED" | "REJECTED";
  reference?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
  subscription: {
    id: string;
    status: string;
    user?: {
      id: string;
      name?: string | null;
      email: string;
    } | null;
    plan?: {
      id: string;
      name: string;
      monthlyPriceCents: number;
    } | null;
  };
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value / 100);
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

async function fetchPayments(): Promise<PaymentRecord[]> {
  const response = await fetch("/api/payments", {
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? "Unable to load payments.");
  }

  return Array.isArray(payload.payments) ? payload.payments : [];
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const refreshPayments = async () => {
    setLoading(true);
    setError("");

    try {
      const nextPayments = await fetchPayments();
      setPayments(nextPayments);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Unable to load payments.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshPayments();
  }, []);

  async function handleReview(paymentId: string, nextStatus: "APPROVED" | "REJECTED") {
    setProcessingId(paymentId);
    setError("");

    try {
      const response = await fetch(`/api/payments/${paymentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to review payment.");
      }

      await refreshPayments();
    } catch (reviewError) {
      setError(
        reviewError instanceof Error
          ? reviewError.message
          : "Unable to review payment.",
      );
    } finally {
      setProcessingId(null);
    }
  }

  const pendingPayments = payments.filter(
    (payment) =>
      payment.status === "PENDING" && payment.subscription.status === "PENDING",
  );

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">Admin</p>
          <h1 className="mt-2 text-4xl font-black">Payment review</h1>
        </div>

        {error ? (
          <div className="mb-6 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          {loading ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-8 text-slate-400">
              Loading pending payments...
            </div>
          ) : pendingPayments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-slate-400">
              No payments are currently awaiting review.
            </div>
          ) : (
            <div className="space-y-4">
              {pendingPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="rounded-2xl border border-slate-700 bg-slate-950 p-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h2 className="text-lg font-semibold">{payment.id}</h2>
                        <span className="rounded-full border border-amber-400/40 bg-amber-500/10 px-2 py-1 text-xs uppercase tracking-wide text-amber-200">
                          {payment.status}
                        </span>
                      </div>

                      <div className="grid gap-2 text-sm text-slate-300 sm:grid-cols-2 xl:grid-cols-4">
                        <div>
                          <p className="text-slate-500">Amount</p>
                          <p className="font-medium text-white">{formatMoney(payment.amountCents)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Method</p>
                          <p className="font-medium text-white">{payment.method}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Created</p>
                          <p className="font-medium text-white">{formatDate(payment.createdAt)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Reference</p>
                          <p className="font-medium text-white">{payment.reference ?? "—"}</p>
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-sm text-slate-300">
                        <p className="text-slate-500">Subscription</p>
                        <p className="mt-1 font-medium text-white">
                          {payment.subscription.plan?.name ?? "Unknown plan"}
                        </p>
                        <p className="mt-1">
                          ID: {payment.subscription.id} · Status: {payment.subscription.status}
                        </p>
                        {payment.subscription.user ? (
                          <p className="mt-1">
                            User: {payment.subscription.user.name ?? payment.subscription.user.email}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex gap-3 lg:flex-col">
                      <button
                        type="button"
                        disabled={processingId === payment.id}
                        onClick={() => void handleReview(payment.id, "APPROVED")}
                        className="rounded-xl bg-emerald-500 px-4 py-2 font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {processingId === payment.id ? "Processing..." : "Approve"}
                      </button>
                      <button
                        type="button"
                        disabled={processingId === payment.id}
                        onClick={() => void handleReview(payment.id, "REJECTED")}
                        className="rounded-xl border border-rose-500/50 bg-rose-500/10 px-4 py-2 font-semibold text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {processingId === payment.id ? "Processing..." : "Reject"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
