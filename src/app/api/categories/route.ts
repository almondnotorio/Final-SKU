import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { createCategorySchema } from "@/lib/validations";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from "@/lib/api-response";
import { ZodError } from "zod";

// GET /api/categories
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return unauthorizedResponse();

    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { skus: true } },
      },
    });

    return successResponse(categories);
  } catch (err) {
    console.error("[GET /api/categories]", err);
    return errorResponse("Internal server error", 500);
  }
}

// POST /api/categories
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return unauthorizedResponse();

    const body = await request.json();
    const data = createCategorySchema.parse(body);

    const existing = await prisma.category.findFirst({
      where: { OR: [{ name: data.name }, { slug: data.slug }] },
    });
    if (existing) {
      return errorResponse(
        existing.name === data.name
          ? "Category name already exists."
          : "Category slug already exists.",
        409
      );
    }

    const category = await prisma.category.create({
      data,
    });

    return successResponse(category, undefined, 201);
  } catch (err) {
    if (err instanceof ZodError) {
      const fieldErrors: Record<string, string[]> = {};
      err.errors.forEach((e) => {
        const key = e.path.join(".");
        if (!fieldErrors[key]) fieldErrors[key] = [];
        fieldErrors[key].push(e.message);
      });
      return validationErrorResponse(fieldErrors);
    }
    console.error("[POST /api/categories]", err);
    return errorResponse("Internal server error", 500);
  }
}
