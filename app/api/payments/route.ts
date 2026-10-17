import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createPaymentSchema = z
  .object({
    subscriptionId: z.string().trim().min(1),
    method: z.enum(["SIMULATED", "MANUAL"]),
    reference: z.string().trim().max(255).nullable().optional(),
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
    const payments = await prisma.payment.findMany({
      where:
        user.role === "ADMIN"
          ? {}
          : {
              subscription: {
                userId: user.id,
              },
            },
      include: {
        subscription: {
          select: {
            id: true,
            status: true,
            plan: {
              select: {
                id: true,
                name: true,
                monthlyPriceCents: true,
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
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ payments });
  } catch (error) {
    console.error("Failed to fetch payments:", error);

    return NextResponse.json(
      { error: "Failed to fetch payments." },
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
  const result = createPaymentSchema.safeParse(body);//check if the format sent meets our expectation

  if (!result.success) {
    return NextResponse.json(
      {
        error: "Invalid payment data.",
        details: result.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    const subscription = await prisma.subscription.findFirst({
      where: {
        id: result.data.subscriptionId,
        userId: user.id,
      },
      select: {
        id: true,
        status: true,
        plan: {
          select: {
            monthlyPriceCents: true,
          },
        },
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "Subscription not found." },
        { status: 404 },
      );
    }

    if (subscription.status !== "PENDING") {
      return NextResponse.json(
        {
          error:
            "Payments can only be submitted for a pending subscription.",
        },
        { status: 409 },
      );
    }

    const payment = await prisma.payment.create({
      data: {
        subscriptionId: subscription.id,
        amountCents: subscription.plan.monthlyPriceCents,
        method: result.data.method,
        reference: result.data.reference,
        status: "PENDING",
      },
      include: {
        subscription: {
          select: {
            id: true,
            status: true,
            plan: {
              select: {
                id: true,
                name: true,
                monthlyPriceCents: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(
      {
        message: "Payment recorded. It is pending review.",
        payment,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to create payment:", error);

    return NextResponse.json(
      { error: "Failed to create payment." },
      { status: 500 },
    );
  }
}
