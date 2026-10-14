import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updatePlanSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    description: z.string().trim().max(500).nullable().optional(),
    monthlyPriceCents: z.number().int().min(0).max(100_000_000).optional(),
    projectLimit: z.number().int().min(1).max(100_000).optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update.",
  });

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function requireAdmin() {
  const user = await getCurrentUser();

  if (!user) {
    return {
      error: NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 },
      ),
    };
  }

  if (user.role !== "ADMIN") {
    return {
      error: NextResponse.json(
        { error: "Forbidden. Admin access required." },
        { status: 403 },
      ),
    };
  }

  return { user };
}

export async function GET(
  _request: Request,
  { params }: RouteContext,
) {
  const { id } = await params;

  try {
    const plan = await prisma.plan.findUnique({
      where: { id },
    });

    if (!plan) {
      return NextResponse.json(
        { error: "Plan not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ plan });
  } catch (error) {
    console.error("Failed to fetch plan:", error);

    return NextResponse.json(
      { error: "Failed to fetch plan." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: RouteContext,
) {
  const auth = await requireAdmin();

  if (auth.error) {
    return auth.error;
  }

  const { id } = await params;

  const body: unknown = await request.json().catch(() => null);
  const result = updatePlanSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      {
        error: "Invalid plan data.",
        details: result.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const updates = result.data;

  try {
    const existingPlan = await prisma.plan.findUnique({
      where: { id },
    });

    if (!existingPlan) {
      return NextResponse.json(
        { error: "Plan not found." },
        { status: 404 },
      );
    }

    if (
      updates.monthlyPriceCents !== undefined &&
      updates.monthlyPriceCents !== existingPlan.monthlyPriceCents
    ) {
      const subscriptionCount = await prisma.subscription.count({
        where: { planId: id },
      });

      if (subscriptionCount > 0) {
        return NextResponse.json(
          {
            error:
              "Cannot change this plan's price while subscriptions reference it. Add subscription price snapshots before changing prices for existing subscribers.",
          },
          { status: 409 },
        );
      }
    }

    const plan = await prisma.plan.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json({ plan });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A plan with this name already exists." },
        { status: 409 },
      );
    }

    console.error("Failed to update plan:", error);

    return NextResponse.json(
      { error: "Failed to update plan." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: RouteContext,
) {
  const auth = await requireAdmin();

  if (auth.error) {
    return auth.error;
  }

  const { id } = await params;

  try {
    const existingPlan = await prisma.plan.findUnique({
      where: { id },
    });

    if (!existingPlan) {
      return NextResponse.json(
        { error: "Plan not found." },
        { status: 404 },
      );
    }

    if (!existingPlan.isActive) {
      return NextResponse.json({ plan: existingPlan });
    }

    const plan = await prisma.plan.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({
      message: "Plan deactivated successfully.",
      plan,
    });
  } catch (error) {
    console.error("Failed to deactivate plan:", error);

    return NextResponse.json(
      { error: "Failed to deactivate plan." },
      { status: 500 },
    );
  }
}
