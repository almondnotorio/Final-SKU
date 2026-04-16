import { prisma } from "@/lib/prisma";
import { resolveAuth } from "@/lib/resolve-auth";
import { createSKUSchema } from "@/lib/validations";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  notFoundResponse,
  validationErrorResponse,
} from "@/lib/api-response";
import { ZodError } from "zod";

// GET /api/skus/[id]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!await resolveAuth(request)) return unauthorizedResponse();

    const { id } = await params;
    const sku = await prisma.sKU.findUnique({
      where: { id },
      include: { category: true, images: { orderBy: { order: "asc" } } },
    });

    if (!sku) return notFoundResponse("SKU");
    return successResponse(sku);
  } catch (err) {
    console.error("[GET /api/skus/:id]", err);
    return errorResponse("Internal server error", 500);
  }
}

// PUT /api/skus/[id]
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolved = await resolveAuth(request);
    if (!resolved) return unauthorizedResponse();
    const { userId } = resolved;

    const { id } = await params;
    const existing = await prisma.sKU.findUnique({ where: { id } });
    if (!existing) return notFoundResponse("SKU");

    const body = await request.json();
    const data = createSKUSchema.parse(body);

    if (data.sku !== existing.sku) {
      const duplicate = await prisma.sKU.findUnique({ where: { sku: data.sku } });
      if (duplicate) return errorResponse("SKU code already in use by another product.", 409);
    }

    const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
    if (!category) return errorResponse("Category not found.", 404);

    const { images: imageData, thumbnail } = body;

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
        include: { category: true, images: { orderBy: { order: "asc" } } },
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

// PATCH /api/skus/[id]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolved = await resolveAuth(request);
    if (!resolved) return unauthorizedResponse();
    const { userId } = resolved;

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

// DELETE /api/skus/[id]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!await resolveAuth(request)) return unauthorizedResponse();

    const { id } = await params;
    const existing = await prisma.sKU.findUnique({ where: { id } });
    if (!existing) return notFoundResponse("SKU");

    await prisma.sKU.delete({ where: { id } });
    return successResponse({ id, deleted: true });
  } catch (err) {
    console.error("[DELETE /api/skus/:id]", err);
    return errorResponse("Internal server error", 500);
  }
}
