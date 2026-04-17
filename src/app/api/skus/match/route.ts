import { prisma } from "@/lib/prisma";
import { resolveAuth } from "@/lib/resolve-auth";
import { normalizeInput, parseOrder } from "@/lib/order-parser";
import { matchSKUs } from "@/lib/sku-matcher";
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/api-response";

// GET /api/skus/match?q=<raw order text>
// Returns top 5 scored SKUs for the given query using the rule-based parser.
export async function GET(request: Request) {
  try {
    if (!await resolveAuth(request)) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();
    if (!q) return errorResponse("Query parameter 'q' is required", 400);

    const skus = await prisma.sKU.findMany({
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

    const normalized = normalizeInput(q);
    const { attributes } = parseOrder(normalized);

    const matchableSKUs = skus.map((s) => ({
      ...s,
      retailPrice: Number(s.retailPrice),
      width: s.width ? Number(s.width) : null,
      height: s.height ? Number(s.height) : null,
      depth: s.depth ? Number(s.depth) : null,
      weight: s.weight ? Number(s.weight) : null,
    }));

    const results = matchSKUs(attributes, matchableSKUs, normalized).slice(0, 5);

    return successResponse(
      results.map((r) => ({
        ...r.sku,
        score: r.score,
        status: r.status,
        matchedAttributes: r.matchedAttributes,
        unmatchedAttributes: r.unmatchedAttributes,
      }))
    );
  } catch (err) {
    console.error("[GET /api/skus/match]", err);
    return errorResponse("Internal server error", 500);
  }
}
