import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createProjectSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    description: z.string().trim().max(500).nullable().optional(),
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
    const projects = await prisma.project.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ projects });
  } catch (error) {
    console.error("Failed to fetch projects:", error);

    return NextResponse.json(
      { error: "Failed to fetch projects." },
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
  const result = createProjectSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      {
        error: "Invalid project data.",
        details: result.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    const activeSubscription = await prisma.subscription.findFirst({
      where: {
        userId: user.id,
        status: "ACTIVE",
      },
      include: {
        plan: {
          select: {
            projectLimit: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!activeSubscription) {
      return NextResponse.json(
        {
          error: "An active subscription is required to create projects.",
        },
        { status: 403 },
      );
    }

    const projectCount = await prisma.project.count({
      where: {
        userId: user.id,
      },
    });

    if (projectCount >= activeSubscription.plan.projectLimit) {
      return NextResponse.json(
        {
          error: "Project limit reached.",
          projectLimit: activeSubscription.plan.projectLimit,
          currentProjectCount: projectCount,
        },
        { status: 409 },
      );
    }

    const project = await prisma.project.create({
      data: {
        name: result.data.name,
        description: result.data.description,
        userId: user.id,
      },
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error("Failed to create project:", error);

    return NextResponse.json(
      { error: "Failed to create project." },
      { status: 500 },
    );
  }
}
