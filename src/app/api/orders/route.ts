import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from "@/lib/api-response";

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20")));
    const status = searchParams.get("status") ?? undefined;
    const skip = (page - 1) * limit;

    const where = status ? { status: status as "PENDING" | "MATCHED" | "PARTIAL_MATCH" | "NO_MATCH" | "INVALID" } : {};

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          matchedSku: {
            select: {
              id: true,
              sku: true,
              name: true,
              thumbnail: true,
              retailPrice: true,
              category: { select: { name: true } },
            },
          },
        },
      }),
      prisma.order.count({ where }),
    ]);

    return successResponse(orders, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("[GET /api/orders]", err);
    return errorResponse("Internal server error", 500);
  }
}
