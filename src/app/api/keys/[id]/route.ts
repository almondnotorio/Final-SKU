import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  notFoundResponse,
} from "@/lib/api-response";

// DELETE /api/keys/[id] — revoke (soft-delete) an API key
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return unauthorizedResponse();

  const { id } = await params;

  const record = await prisma.apiKey.findUnique({ where: { id } });
  if (!record) return notFoundResponse("API key");
  if (record.createdBy !== userId) return errorResponse("Forbidden", 403);

  await prisma.apiKey.update({ where: { id }, data: { isActive: false } });

  return successResponse({ id, revoked: true });
}
