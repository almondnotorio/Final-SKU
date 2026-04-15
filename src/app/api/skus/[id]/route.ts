import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { createSKUSchema } from "@/lib/validations";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  notFoundResponse,
  validationErrorResponse,
} from "@/lib/api-response";
import { ZodError } from "zod";

// GET /api/skus/[id] - Get a single SKU by ID
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return unauthorizedResponse();

    const { id } = await params;
    const sku = await prisma.sKU.findUnique({
      where: { id },
      include: {
        category: true,
        images: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!sku) return notFoundResponse("SKU");
    return successResponse(sku);
  } catch (err) {
    console.error("[GET /api/skus/:id]", err);
    return errorResponse("Internal server error", 500);
  }
}

// PUT /api/skus/[id] - Update a SKU
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return unauthorizedResponse();

    const { id } = await params;
    const existing = await prisma.sKU.findUnique({ where: { id } });
    if (!existing) return notFoundResponse("SKU");

    const body = await request.json();
    const data = createSKUSchema.parse(body);

    // Check SKU code uniqueness (allow same SKU to keep its own code)
    if (data.sku !== existing.sku) {
      const duplicate = await prisma.sKU.findUnique({ where: { sku: data.sku } });
      if (duplicate) {
        return errorResponse("SKU code already in use by another product.", 409);
      }
    }

    // Verify category exists
    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
    });
    if (!category) return errorResponse("Category not found.", 404);

    const { images: imageData, thumbnail } = body;

    // Use a transaction to update SKU and replace images atomically
    const updated = await prisma.$transaction(async (tx) => {
      if (imageData !== undefined) {
        await tx.image.deleteMany({ where: { skuId: id } });
      }

      return tx.sKU.update({
        where: { id },
        data: {
          ...data,
          thumbnail: thumbnail ?? null,
          updatedBy: userId,
          ...(imageData !== undefined && {
            images: {
              create: imageData.map(
                (img: { url: string; alt?: string; isPrimary?: boolean; order?: number }) => ({
                  url: img.url,
                  alt: img.alt ?? null,
                  isPrimary: img.isPrimary ?? false,
                  order: img.order ?? 0,
                })
              ),
            },
          }),
        },
        include: {
          category: true,
          images: { orderBy: { order: "asc" } },
        },
      });
    });

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
    console.error("[PUT /api/skus/:id]", err);
    return errorResponse("Internal server error", 500);
  }
}

// PATCH /api/skus/[id] - Partial update (e.g. status change)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return unauthorizedResponse();

    const { id } = await params;
    const existing = await prisma.sKU.findUnique({ where: { id } });
    if (!existing) return notFoundResponse("SKU");

    const body = await request.json();
    const partial = createSKUSchema.partial().parse(body);

    const updated = await prisma.sKU.update({
      where: { id },
      data: { ...partial, updatedBy: userId },
      include: { category: true, images: true },
    });

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
    console.error("[PATCH /api/skus/:id]", err);
    return errorResponse("Internal server error", 500);
  }
}

// DELETE /api/skus/[id] - Delete a SKU
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return unauthorizedResponse();

    const { id } = await params;
    const existing = await prisma.sKU.findUnique({ where: { id } });
    if (!existing) return notFoundResponse("SKU");

    // Images cascade delete via Prisma schema (onDelete: Cascade)
    await prisma.sKU.delete({ where: { id } });

    return successResponse({ id, deleted: true });
  } catch (err) {
    console.error("[DELETE /api/skus/:id]", err);
    return errorResponse("Internal server error", 500);
  }
}
