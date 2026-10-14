"use client";

import { FormEvent, useEffect, useState } from "react";

type Project = {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
};

type Subscription = {
  id: string;
  status: string;
  plan: {
    name: string;
    monthlyPriceCents: number;
    projectLimit: number;
  };
};

type Usage = {
  subscription: {
    id: string;
    status: string;
    plan: {
      name: string;
      monthlyPriceCents: number;
      projectLimit: number;
    };
  } | null;
  usage: {
    projects: {
      current: number;
      limit: number;
      remaining: number;
      limitReached: boolean;
    };
  };
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value / 100);
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [projectForm, setProjectForm] = useState({ name: "", description: "" });
  const [projectError, setProjectError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadDashboard() {
    try {
      const [projectsResponse, subscriptionsResponse, usageResponse] = await Promise.all([
        fetch("/api/projects"),
        fetch("/api/subscriptions"),
        fetch("/api/usage/me"),
      ]);

      if (projectsResponse.ok) {
        const projectsPayload = await projectsResponse.json();
        setProjects(projectsPayload.projects ?? []);
      }

      if (subscriptionsResponse.ok) {
        const subscriptionPayload = await subscriptionsResponse.json();
        setSubscriptions(subscriptionPayload.subscriptions ?? []);
      }

      if (usageResponse.ok) {
        const usagePayload = await usageResponse.json();
        setUsage(usagePayload);
      }
    } catch (error) {
      setProjectError("Could not load dashboard data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  async function handleProjectSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProjectError("");

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectForm),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not create project.");
      }

      setProjectForm({ name: "", description: "" });
      await loadDashboard();
    } catch (submitError) {
      setProjectError(
        submitError instanceof Error
          ? submitError.message
          : "Could not create project.",
      );
    }
  }

  const activeSubscription = subscriptions.find(
    (subscription) => subscription.status === "ACTIVE" || subscription.status === "PENDING",
  );

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">Overview</p>
            <h1 className="mt-2 text-4xl font-black">Dashboard</h1>
          </div>
        </header>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-36 animate-pulse rounded-3xl border border-slate-800 bg-slate-900" />
            ))}
          </div>
        ) : (
          <>
            <section className="mb-8 grid gap-6 md:grid-cols-3">
              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
                <p className="text-sm text-slate-400">Active plan</p>
                <div className="mt-3 text-2xl font-bold">
                  {activeSubscription?.plan?.name ?? "No active plan"}
                </div>
                {activeSubscription ? (
                  <p className="mt-2 text-sm text-slate-300">
                    {formatMoney(activeSubscription.plan.monthlyPriceCents)} / month
                  </p>
                ) : null}
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
                <p className="text-sm text-slate-400">Projects used</p>
                <div className="mt-3 text-2xl font-bold">
                  {usage?.usage.projects.current ?? 0} / {usage?.usage.projects.limit ?? 0}
                </div>
                <p className="mt-2 text-sm text-slate-300">
                  {usage?.usage.projects.remaining ?? 0} remaining
                </p>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
                <p className="text-sm text-slate-400">Subscription status</p>
                <div className="mt-3 text-2xl font-bold capitalize">
                  {activeSubscription?.status?.toLowerCase() ?? "No subscription"}
                </div>
                <p className="mt-2 text-sm text-slate-300">
                  {usage?.subscription?.plan?.name ?? "No plan attached"}
                </p>
              </div>
            </section>

            <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
              <form onSubmit={handleProjectSubmit} className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
                <h2 className="mb-5 text-2xl font-bold">Create project</h2>

                <div className="space-y-5">
                  <label className="block text-sm text-slate-300">
                    <span className="mb-2 block">Project name</span>
                    <input
                      type="text"
                      value={projectForm.name}
                      onChange={(event) =>
                        setProjectForm((current) => ({ ...current, name: event.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none transition focus:border-cyan-400"
                      placeholder="Client portal"
                      required
                    />
                  </label>

                  <label className="block text-sm text-slate-300">
                    <span className="mb-2 block">Description</span>
                    <textarea
                      value={projectForm.description}
                      onChange={(event) =>
                        setProjectForm((current) => ({ ...current, description: event.target.value }))
                      }
                      className="min-h-28 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none transition focus:border-cyan-400"
                      placeholder="Brief summary of the project"
                    />
                  </label>

                  {projectError ? (
                    <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                      {projectError}
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    className="w-full rounded-xl bg-cyan-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400"
                  >
                    Add project
                  </button>
                </div>
              </form>

              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
                <h2 className="mb-5 text-2xl font-bold">Projects</h2>

                {projects.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-700 p-6 text-center text-slate-400">
                    No projects created yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {projects.map((project) => (
                      <div key={project.id} className="rounded-2xl border border-slate-700 bg-slate-950 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="text-lg font-semibold">{project.name}</h3>
                          <span className="rounded-full bg-slate-800 px-2 py-1 text-xs uppercase tracking-wide text-slate-300">
                            Active
                          </span>
                        </div>
                        {project.description ? (
                          <p className="mt-2 text-sm text-slate-300">{project.description}</p>
                        ) : null}
                        <p className="mt-3 text-xs text-slate-500">
                          Created {new Date(project.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
