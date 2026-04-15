import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/api-response";

// GET /api/dashboard - Dashboard stats
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return unauthorizedResponse();

    const [
      totalSKUs,
      activeSKUs,
      outOfStock,
      discontinued,
      totalCategories,
      recentSKUs,
    ] = await Promise.all([
      prisma.sKU.count(),
      prisma.sKU.count({ where: { status: "ACTIVE" } }),
      prisma.sKU.count({ where: { status: "OUT_OF_STOCK" } }),
      prisma.sKU.count({ where: { status: "DISCONTINUED" } }),
      prisma.category.count(),
      prisma.sKU.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
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
          category: { select: { id: true, name: true } },
        },
      }),
    ]);

    return successResponse({
      totalSKUs,
      activeSKUs,
      outOfStock,
      discontinued,
      totalCategories,
      recentSKUs,
    });
  } catch (err) {
    console.error("[GET /api/dashboard]", err);
    return errorResponse("Internal server error", 500);
  }
}
