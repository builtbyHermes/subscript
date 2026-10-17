import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const reviewPaymentSchema = z
  .object({
    status: z.enum(["APPROVED", "REJECTED"]),
  })
  .strict();

type RouteContext = {
  params: Promise<{ id: string }>;
};

function addOneCalendarMonth(date: Date): Date {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const milliseconds = date.getMilliseconds();

  const targetMonth = month + 1;
  const targetYear = targetMonth === 12 ? year + 1 : year;
  const targetMonthIndex = targetMonth === 12 ? 0 : targetMonth;

  const lastDayOfTargetMonth = new Date(
    targetYear,
    targetMonthIndex + 1,
    0,
  ).getDate();

  const clampedDay = Math.min(day, lastDayOfTargetMonth);

  return new Date(
    targetYear,
    targetMonthIndex,
    clampedDay,
    hours,
    minutes,
    seconds,
    milliseconds,
  );
}

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
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

  if (user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden. Admin access required." },
      { status: 403 },
    );
  }

  const { id } = await params;

  const body: unknown = await request.json().catch(() => null);
  const result = reviewPaymentSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      {
        error: "Invalid payment review data.",
        details: result.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const reviewStatus = result.data.status;
  const reviewedAt = new Date();

  try {
    const updatedPayment = await prisma.$transaction(
      async (tx) => {
        const payment = await tx.payment.findUnique({
        where: { id },
        include: {
          subscription: {
            select: {
              id: true,
              status: true,
              startDate: true,
              endDate: true,
              plan: {
                select: {
                  id: true,
                  name: true,
                  monthlyPriceCents: true,
                  projectLimit: true,
                },
              },
            },
          },
        },
      });

        if (!payment) {
          throw new HttpError(404, "Payment not found.");
        }

        if (payment.status !== "PENDING") {
          throw new HttpError(
            409,
            "Only pending payments can be reviewed.",
          );
        }

        if (payment.subscription.status !== "PENDING") {
          throw new HttpError(
            409,
            "The associated subscription is not pending and cannot be activated.",
          );
        }

        if (reviewStatus === "APPROVED") {
          const subscriptionUpdate = await tx.subscription.updateMany({
            where: {
              id: payment.subscriptionId,
              status: "PENDING",
            },
            data: {
              status: "ACTIVE",
              startDate: reviewedAt,
              endDate: addOneCalendarMonth(reviewedAt),
            },
          });

          if (subscriptionUpdate.count !== 1) {
            throw new HttpError(
              409,
              "This subscription has already been activated or is no longer pending.",
            );
          }
        }

        const paymentUpdate = await tx.payment.updateMany({
          where: {
            id,
            status: "PENDING",
          },
          data: {
            status: reviewStatus,
            reviewedAt,
          },
        });

        if (paymentUpdate.count !== 1) {
          throw new HttpError(
            409,
            "This payment has already been reviewed.",
          );
        }

        return tx.payment.findUnique({
          where: { id },
          include: {
            subscription: {
              select: {
                id: true,
                status: true,
                startDate: true,
                endDate: true,
                plan: {
                  select: {
                    id: true,
                    name: true,
                    monthlyPriceCents: true,
                    projectLimit: true,
                  },
                },
              },
            },
          },
        });
      },
      {
        isolationLevel: "Serializable",
      },
    );

    if (!updatedPayment) {
      return NextResponse.json(
        { error: "Payment not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ payment: updatedPayment });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2034"
    ) {
      return NextResponse.json(
        { error: "A concurrent review is in progress. Please retry." },
        { status: 409 },
      );
    }

    console.error("Failed to review payment:", error);

    return NextResponse.json(
      { error: "Failed to review payment." },
      { status: 500 },
    );
  }
}
