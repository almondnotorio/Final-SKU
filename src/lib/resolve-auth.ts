import { auth } from "@clerk/nextjs/server";
import { verifyApiKey } from "./api-key";

/**
 * Resolves the authenticated user ID from either:
 * 1. A Clerk session (dashboard / same-origin requests)
 * 2. An `Authorization: Bearer <api-key>` header (external apps)
 *
 * Returns `{ userId }` on success, or `null` if unauthenticated.
 */
export async function resolveAuth(request: Request): Promise<{ userId: string } | null> {
  // 1. Try Clerk session first
  const { userId } = await auth();
  if (userId) return { userId };

  // 2. Fall back to API key in Authorization header
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const key = authHeader.slice(7).trim();
    return verifyApiKey(key);
  }

  return null;
}
