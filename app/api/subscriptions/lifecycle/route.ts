import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
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

  const now = new Date();

  try {
    const [canceledResult, expiredResult] = await prisma.$transaction([
      prisma.subscription.updateMany({
        where: {
          status: "ACTIVE",
          cancelAtPeriodEnd: true,
          endDate: {
            not: null,
            lte: now,
          },
        },
        data: {
          status: "CANCELED",
          canceledAt: now,
          cancelAtPeriodEnd: false,
        },
      }),

      prisma.subscription.updateMany({
        where: {
          status: "ACTIVE",
          cancelAtPeriodEnd: false,
          endDate: {
            not: null,
            lte: now,
          },
        },
        data: {
          status: "EXPIRED",
        },
      }),
    ]);

    return NextResponse.json({
      message: "Subscription lifecycle processing completed.",
      processed: {
        canceled: canceledResult.count,
        expired: expiredResult.count,
        total: canceledResult.count + expiredResult.count,
      },
      processedAt: now,
    });
  } catch (error) {
    console.error("Failed to process subscription lifecycle:", error);

    return NextResponse.json(
      { error: "Failed to process subscription lifecycle." },
      { status: 500 },
    );
  }
}
