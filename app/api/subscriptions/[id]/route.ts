import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateSubscriptionSchema = z
  .object({
    cancelAtPeriodEnd: z.literal(true),
  })
  .strict();

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _request: Request,
  { params }: RouteContext,
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Not authenticated." },
      { status: 401 },
    );
  }

  const { id } = await params;

  try {
    const subscription = await prisma.subscription.findFirst({
      where: {
        id,
        ...(user.role === "ADMIN" ? {} : { userId: user.id }),
      },
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
        ...(user.role === "ADMIN"
          ? {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            }
          : {}),
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "Subscription not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ subscription });
  } catch (error) {
    console.error("Failed to fetch subscription:", error);

    return NextResponse.json(
      { error: "Failed to fetch subscription." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: RouteContext,
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Not authenticated." },
      { status: 401 },
    );
  }

  const { id } = await params;

  const body: unknown = await request.json().catch(() => null);
  const result = updateSubscriptionSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      {
        error: "Invalid subscription update.",
        details: result.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    const subscription = await prisma.subscription.findFirst({
      where: {
        id,
        ...(user.role === "ADMIN" ? {} : { userId: user.id }),
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "Subscription not found." },
        { status: 404 },
      );
    }

    if (subscription.status !== "ACTIVE") {
      return NextResponse.json(
        {
          error: "Only active subscriptions can be scheduled for cancellation.",
        },
        { status: 409 },
      );
    }

    if (subscription.cancelAtPeriodEnd) {
      return NextResponse.json(
        {
          message: "Cancellation is already scheduled.",
          subscription,
        },
      );
    }

    const updatedSubscription = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        cancelAtPeriodEnd: true,
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

    return NextResponse.json({
      message: "Subscription cancellation scheduled successfully.",
      subscription: updatedSubscription,
    });
  } catch (error) {
    console.error("Failed to update subscription:", error);

    return NextResponse.json(
      { error: "Failed to update subscription." },
      { status: 500 },
    );
  }
}
