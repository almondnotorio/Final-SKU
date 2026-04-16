import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { generateApiKey } from "@/lib/api-key";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from "@/lib/api-response";
import { z } from "zod";

const createKeySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  expiresAt: z.string().datetime().optional().nullable(),
});

// GET /api/keys — list all API keys for the current user (no key values)
export async function GET() {
  const { userId } = await auth();
  if (!userId) return unauthorizedResponse();

  const keys = await prisma.apiKey.findMany({
    where: { createdBy: userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      isActive: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  return successResponse(keys);
}

// POST /api/keys — create a new API key (returns plaintext key ONCE)
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return unauthorizedResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const parsed = createKeySchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.errors[0].message, 422);
  }

  const { name, expiresAt } = parsed.data;
  const { key, keyHash, keyPrefix } = generateApiKey();

  const record = await prisma.apiKey.create({
    data: {
      name,
      keyHash,
      keyPrefix,
      createdBy: userId,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      isActive: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  // Return the plaintext key here — this is the ONLY time it is exposed
  return successResponse({ ...record, key }, undefined, 201);
}
