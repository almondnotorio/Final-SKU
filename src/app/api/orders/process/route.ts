import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from "@/lib/api-response";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return unauthorizedResponse();

    const body = await request.json();
    const rawInput: string = body?.rawInput?.trim();
    if (!rawInput) return errorResponse("Order input is required", 400);

    const skus = await prisma.sKU.findMany({
      where: { status: "ACTIVE" },
      include: { category: { select: { name: true } } },
    });

    const skuCatalog = skus.map((sku) => ({
      id: sku.id,
      sku: sku.sku,
      name: sku.name,
      category: sku.category.name,
      description: sku.description ?? null,
      shortDescription: sku.shortDescription ?? null,
      width: sku.width ? Number(sku.width) : null,
      height: sku.height ? Number(sku.height) : null,
      depth: sku.depth ? Number(sku.depth) : null,
      weight: sku.weight ? Number(sku.weight) : null,
      color: sku.color ?? null,
      material: sku.material ?? null,
      finish: sku.finish ?? null,
      mountingType: sku.mountingType ?? null,
      numberOfDoors: sku.numberOfDoors ?? null,
      lockType: sku.lockType ?? null,
      postalApproved: sku.postalApproved,
      features: sku.features,
      tags: sku.tags,
      retailPrice: Number(sku.retailPrice),
      stockQuantity: sku.stockQuantity,
    }));

    const systemPrompt = `You are an order processing assistant for a signage and mailbox catalog company.
Your job is to parse customer orders written in natural language, extract structured attributes, and match them to the best available SKU.

Rules for status:
- "MATCHED": high confidence (>0.75), all critical attributes align with a specific SKU
- "PARTIAL_MATCH": some attributes match but info is missing, ambiguous, or not a perfect fit (0.4–0.75)
- "NO_MATCH": no suitable SKU found in the catalog (<0.4 confidence or incompatible specs)
- "INVALID": order is nonsensical, missing all critical info, or completely unrecognizable

Always populate flags with specific actionable issues such as:
- "Missing quantity"
- "Size not found in catalog"
- "Ambiguous material specification"
- "Requested color unavailable"
- "Rush delivery not a catalog attribute"

Return ONLY a valid JSON object — no markdown, no explanation outside the JSON.`;

    const userPrompt = `CUSTOMER ORDER:
"${rawInput}"

AVAILABLE SKUs (${skus.length} active):
${JSON.stringify(skuCatalog, null, 2)}

Return a JSON object with this exact structure:
{
  "parsedAttributes": { /* all attributes extracted from the order as key-value pairs */ },
  "matchedSkuId": "database-id-or-null",
  "matchedSkuCode": "SKU-CODE-or-null",
  "confidence": 0.0,
  "status": "MATCHED|PARTIAL_MATCH|NO_MATCH|INVALID",
  "flags": ["specific issue 1", "specific issue 2"],
  "notes": "Detailed explanation of the match decision, what was found, what's missing or ambiguous"
}`;

    type AiResult = {
      parsedAttributes?: Record<string, unknown>;
      matchedSkuId?: string | null;
      matchedSkuCode?: string | null;
      confidence?: number;
      status?: string;
      flags?: string[];
      notes?: string;
    };

    async function tryCallAI(): Promise<AiResult> {
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          max_tokens: 1024,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
        });
        const responseText = completion.choices[0]?.message?.content ?? "";
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        return JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
      } catch {
        return {
          parsedAttributes: {},
          matchedSkuId: null,
          confidence: 0,
          status: "PENDING",
          flags: ["AI processing unavailable — order saved for manual review"],
          notes: "AI processing could not be completed. The order has been saved and requires manual review.",
        };
      }
    }

    const aiResult = await tryCallAI();

    const validStatuses = ["PENDING", "MATCHED", "PARTIAL_MATCH", "NO_MATCH", "INVALID"];
    const status = validStatuses.includes(aiResult.status ?? "")
      ? (aiResult.status as "PENDING" | "MATCHED" | "PARTIAL_MATCH" | "NO_MATCH" | "INVALID")
      : "PENDING";

    // Verify the suggested matchedSkuId actually exists
    const matchedSkuId =
      aiResult.matchedSkuId && skus.some((s) => s.id === aiResult.matchedSkuId)
        ? aiResult.matchedSkuId
        : null;

    const order = await prisma.order.create({
      data: {
        rawInput,
        parsedData: (aiResult.parsedAttributes ?? {}) as object,
        matchedSkuId,
        confidence: aiResult.confidence ?? null,
        status,
        flags: aiResult.flags ?? [],
        notes: aiResult.notes ?? null,
        userId,
      },
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
    });

    return successResponse({ order, parsedAttributes: aiResult.parsedAttributes }, undefined, 201);
  } catch (err) {
    console.error("[POST /api/orders/process]", err);
    return errorResponse("Internal server error", 500);
  }
}
