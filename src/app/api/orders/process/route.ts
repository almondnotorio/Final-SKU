import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { normalizeInput, parseOrder, type ParsedOrderAttributes } from "@/lib/order-parser";
import { matchSKUs, deriveOrderStatus, type MatchableSKU } from "@/lib/sku-matcher";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from "@/lib/api-response";

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return unauthorizedResponse();

    const body = await request.json();
    const rawInput: string = body?.rawInput?.trim();
    if (!rawInput) return errorResponse("Order input is required", 400);

    // Client sends its chip state (may include manual edits)
    const clientAttrs: ParsedOrderAttributes = body?.parsedAttributes ?? {};
    const clientMatchedSkuId: string | null = body?.matchedSkuId ?? null;

    // Server-side parse as authoritative cross-check
    const normalized = normalizeInput(rawInput);
    const { attributes: serverAttrs, flags } = parseOrder(normalized);

    // Merge: client manual edits win over server parse for fields they set
    const mergedAttrs: ParsedOrderAttributes = { ...serverAttrs, ...clientAttrs };

    // Fetch active SKUs for server-side matching
    const skusRaw = await prisma.sKU.findMany({
      where: { status: { in: ["ACTIVE", "DISCONTINUED"] } },
      select: {
        id: true, sku: true, name: true, thumbnail: true, status: true,
        retailPrice: true, color: true, material: true, finish: true,
        mountingType: true, numberOfDoors: true, lockType: true,
        postalApproved: true, tags: true, features: true,
        width: true, height: true, depth: true, weight: true,
        category: { select: { name: true } },
      },
    });

    const skus: MatchableSKU[] = skusRaw.map((s) => ({
      ...s,
      retailPrice: Number(s.retailPrice),
      width: s.width ? Number(s.width) : null,
      height: s.height ? Number(s.height) : null,
      depth: s.depth ? Number(s.depth) : null,
      weight: s.weight ? Number(s.weight) : null,
    }));

    const scored = matchSKUs(mergedAttrs, skus, normalized);
    const topMatch = scored[0];
    const topScore = topMatch?.score ?? 0;

    // Use client's matchedSkuId if provided and valid; fall back to server top match
    const matchedSkuId =
      clientMatchedSkuId && skus.some((s) => s.id === clientMatchedSkuId)
        ? clientMatchedSkuId
        : topScore >= 0.4
        ? (topMatch?.sku.id ?? null)
        : null;

    const status = deriveOrderStatus(matchedSkuId ? topScore : 0);
    const notes = matchedSkuId
      ? `Matched via rule-based parser — score: ${Math.round(topScore * 100)}%`
      : "No suitable SKU match found by rule-based parser";

    const order = await prisma.order.create({
      data: {
        rawInput,
        parsedData: mergedAttrs as object,
        matchedSkuId,
        confidence: topScore,
        status,
        flags,
        notes,
        userId,
      },
      include: {
        matchedSku: {
          select: {
            id: true, sku: true, name: true, thumbnail: true,
            retailPrice: true,
            category: { select: { name: true } },
          },
        },
      },
    });

    return successResponse({ order, parsedAttributes: mergedAttrs }, undefined, 201);
  } catch (err) {
    console.error("[POST /api/orders/process]", err);
    return errorResponse("Internal server error", 500);
  }
}
