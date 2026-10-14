import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateProjectSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    description: z.string().trim().max(500).nullable().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update.",
  });

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
    const project = await prisma.project.findFirst({
      where: {
        id,
        ...(user.role === "ADMIN" ? {} : { userId: user.id }),
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ project });
  } catch (error) {
    console.error("Failed to fetch project:", error);

    return NextResponse.json(
      { error: "Failed to fetch project." },
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
  const result = updateProjectSchema.safeParse(body);

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
    const existingProject = await prisma.project.findFirst({
      where: {
        id,
        ...(user.role === "ADMIN" ? {} : { userId: user.id }),
      },
      select: { id: true },
    });

    if (!existingProject) {
      return NextResponse.json(
        { error: "Project not found." },
        { status: 404 },
      );
    }

    const project = await prisma.project.update({
      where: { id: existingProject.id },
      data: result.data,
    });

    return NextResponse.json({ project });
  } catch (error) {
    console.error("Failed to update project:", error);

    return NextResponse.json(
      { error: "Failed to update project." },
      { status: 500 },
    );
  }
}

export async function DELETE(
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
    const existingProject = await prisma.project.findFirst({
      where: {
        id,
        ...(user.role === "ADMIN" ? {} : { userId: user.id }),
      },
      select: { id: true },
    });

    if (!existingProject) {
      return NextResponse.json(
        { error: "Project not found." },
        { status: 404 },
      );
    }

    await prisma.project.delete({
      where: { id: existingProject.id },
    });

    return NextResponse.json({
      message: "Project deleted successfully.",
    });
  } catch (error) {
    console.error("Failed to delete project:", error);

    return NextResponse.json(
      { error: "Failed to delete project." },
      { status: 500 },
    );
  }
}
