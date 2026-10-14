import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createSubscriptionSchema = z
  .object({
    planId: z.string().trim().min(1),
  })
  .strict();

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Not authenticated." },
      { status: 401 },
    );
  }

  try {
    const subscriptions = await prisma.subscription.findMany({
      where: { userId: user.id },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            description: true,
            monthlyPriceCents: true,
            projectLimit: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ subscriptions });
  } catch (error) {
    console.error("Failed to fetch subscriptions:", error);

    return NextResponse.json(
      { error: "Failed to fetch subscriptions." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Not authenticated." },
      { status: 401 },
    );
  }

  const body: unknown = await request.json().catch(() => null);
  const result = createSubscriptionSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      {
        error: "Invalid subscription data.",
        details: result.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    const plan = await prisma.plan.findFirst({
      where: {
        id: result.data.planId,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    if (!plan) {
      return NextResponse.json(
        { error: "Plan not found or is no longer available." },
        { status: 404 },
      );
    }

    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        userId: user.id,
        status: {
          in: ["PENDING", "ACTIVE"],
        },
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (existingSubscription) {
      return NextResponse.json(
        {
          error:
            "You already have a pending or active subscription.",
          subscription: existingSubscription,
        },
        { status: 409 },
      );
    }

    const subscription = await prisma.subscription.create({
      data: {
        userId: user.id,
        planId: plan.id,
        status: "PENDING",
      },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            monthlyPriceCents: true,
            projectLimit: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        message:
          "Subscription created. Payment verification is required before activation.",
        subscription,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to create subscription:", error);

    return NextResponse.json(
      { error: "Failed to create subscription." },
      { status: 500 },
    );
  }
}
