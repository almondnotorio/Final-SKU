import { prisma } from "@/lib/prisma";
import { resolveAuth } from "@/lib/resolve-auth";
import { createCategorySchema } from "@/lib/validations";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  notFoundResponse,
  validationErrorResponse,
} from "@/lib/api-response";
import { ZodError } from "zod";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!await resolveAuth(request)) return unauthorizedResponse();

    const { id } = await params;
    const category = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { skus: true } } },
    });

    if (!category) return notFoundResponse("Category");
    return successResponse(category);
  } catch (err) {
    console.error("[GET /api/categories/:id]", err);
    return errorResponse("Internal server error", 500);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!await resolveAuth(request)) return unauthorizedResponse();

    const { id } = await params;
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) return notFoundResponse("Category");

    const body = await request.json();
    const data = createCategorySchema.parse(body);

    const updated = await prisma.category.update({ where: { id }, data });
    return successResponse(updated);
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
    console.error("[PUT /api/categories/:id]", err);
    return errorResponse("Internal server error", 500);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!await resolveAuth(request)) return unauthorizedResponse();

    const { id } = await params;
    const existing = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { skus: true } } },
    });
    if (!existing) return notFoundResponse("Category");

    if (existing._count.skus > 0) {
      return errorResponse(
        `Cannot delete category with ${existing._count.skus} associated SKU(s). Reassign SKUs first.`,
        409
      );
    }

    await prisma.category.delete({ where: { id } });
    return successResponse({ id, deleted: true });
  } catch (err) {
    console.error("[DELETE /api/categories/:id]", err);
    return errorResponse("Internal server error", 500);
  }
}
