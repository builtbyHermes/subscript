import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Not authenticated." },
      { status: 401 },
    );
  }

  try {
    const [projectCount, activeSubscription] = await Promise.all([
      prisma.project.count({
        where: { userId: user.id },
      }),

      prisma.subscription.findFirst({
        where: {
          userId: user.id,
          status: "ACTIVE",
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
        orderBy: {
          createdAt: "desc",
        },
      }),
    ]);

    if (!activeSubscription) {
      return NextResponse.json({
        subscription: null,
        usage: {
          projects: {
            current: projectCount,
            limit: 0,
            remaining: 0,
            limitReached: projectCount > 0,
          },
        },
      });
    }

    const projectLimit = activeSubscription.plan.projectLimit;
    const remainingProjects = Math.max(
      0,
      projectLimit - projectCount,
    );

    return NextResponse.json({
      subscription: {
        id: activeSubscription.id,
        status: activeSubscription.status,
        startDate: activeSubscription.startDate,
        endDate: activeSubscription.endDate,
        cancelAtPeriodEnd: activeSubscription.cancelAtPeriodEnd,
        plan: activeSubscription.plan,
      },
      usage: {
        projects: {
          current: projectCount,
          limit: projectLimit,
          remaining: remainingProjects,
          limitReached: projectCount >= projectLimit,
        },
      },
    });
  } catch (error) {
    console.error("Failed to fetch usage:", error);

    return NextResponse.json(
      { error: "Failed to fetch usage." },
      { status: 500 },
    );
  }
}
