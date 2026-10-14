import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createPlanSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    description: z.string().trim().max(500).nullable().optional(),
    monthlyPriceCents: z.number().int().min(0).max(100_000_000),
    projectLimit: z.number().int().min(1).max(100_000),
    isActive: z.boolean().optional(),
  })
  .strict();

export async function GET() {
  try {
    const plans = await prisma.plan.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        monthlyPriceCents: "asc",
      },
    });

    return NextResponse.json({ plans });
  } catch (error) {
    console.error("Failed to fetch plans:", error);

    return NextResponse.json(
      { error: "Failed to fetch plans." },
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

  if (user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden. Admin access required." },
      { status: 403 },
    );
  }

  const body: unknown = await request.json().catch(() => null);
  const result = createPlanSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      {
        error: "Invalid plan data.",
        details: result.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const {
    name,
    description,
    monthlyPriceCents,
    projectLimit,
    isActive,
  } = result.data;

  try {
    const plan = await prisma.plan.create({
      data: {
        name,
        description,
        monthlyPriceCents,
        projectLimit,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json({ plan }, { status: 201 });
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

    console.error("Failed to create plan:", error);

    return NextResponse.json(
      { error: "Failed to create plan." },
      { status: 500 },
    );
  }
}
