import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { createSKUSchema, skuQuerySchema } from "@/lib/validations";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from "@/lib/api-response";
import { ZodError } from "zod";

// GET /api/skus - List all SKUs with filtering, sorting, pagination
export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const query = skuQuerySchema.parse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      categoryId: searchParams.get("categoryId") ?? undefined,
      sortBy: searchParams.get("sortBy") ?? undefined,
      sortOrder: searchParams.get("sortOrder") ?? undefined,
    });

    const { page, limit, search, status, categoryId, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const where = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { sku: { contains: search, mode: "insensitive" as const } },
          { description: { contains: search, mode: "insensitive" as const } },
          { color: { contains: search, mode: "insensitive" as const } },
          { tags: { has: search.toLowerCase() } },
        ],
      }),
      ...(status && { status }),
      ...(categoryId && { categoryId }),
    };

    const [items, total] = await Promise.all([
      prisma.sKU.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          sku: true,
          name: true,
          retailPrice: true,
          wholesalePrice: true,
          status: true,
          stockQuantity: true,
          thumbnail: true,
          color: true,
          createdAt: true,
          updatedAt: true,
          category: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.sKU.count({ where }),
    ]);

    return successResponse(items, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
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
    console.error("[GET /api/skus]", err);
    return errorResponse("Internal server error", 500);
  }
}

// POST /api/skus - Create a new SKU
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return unauthorizedResponse();

    const body = await request.json();
    const data = createSKUSchema.parse(body);

    // Check for duplicate SKU code
    const existing = await prisma.sKU.findUnique({ where: { sku: data.sku } });
    if (existing) {
      return errorResponse("SKU code already exists. Please use a unique code.", 409);
    }

    // Verify category exists
    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
    });
    if (!category) {
      return errorResponse("Category not found.", 404);
    }

    const { images: imageData, thumbnail, ...skuData } = body;

    const sku = await prisma.sKU.create({
      data: {
        ...data,
        thumbnail: thumbnail ?? null,
        createdBy: userId,
        images: imageData?.length
          ? {
              create: imageData.map(
                (img: { url: string; alt?: string; isPrimary?: boolean; order?: number }) => ({
                  url: img.url,
                  alt: img.alt ?? null,
                  isPrimary: img.isPrimary ?? false,
                  order: img.order ?? 0,
                })
              ),
            }
          : undefined,
      },
      include: {
        category: true,
        images: true,
      },
    });

    return successResponse(sku, undefined, 201);
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
    console.error("[POST /api/skus]", err);
    return errorResponse("Internal server error", 500);
  }
}
