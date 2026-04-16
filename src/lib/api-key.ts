import { createHash, randomBytes } from "crypto";
import { prisma } from "./prisma";

const PREFIX = "sku_live_";

/**
 * Generate a new API key.
 * Returns the plaintext key (shown to user ONCE) plus the hash and prefix to store.
 */
export function generateApiKey(): { key: string; keyHash: string; keyPrefix: string } {
  const secret = randomBytes(32).toString("hex"); // 64 hex chars
  const key = `${PREFIX}${secret}`;
  const keyHash = hashApiKey(key);
  const keyPrefix = key.slice(0, PREFIX.length + 8); // e.g. "sku_live_ab12cd34"
  return { key, keyHash, keyPrefix };
}

/** SHA-256 hash of a raw key string */
export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/**
 * Verify an incoming API key from the Authorization header.
 * Updates lastUsedAt on success. Returns null if invalid/inactive.
 */
export async function verifyApiKey(key: string): Promise<{ userId: string } | null> {
  if (!key.startsWith(PREFIX)) return null;

  const keyHash = hashApiKey(key);

  const record = await prisma.apiKey.findUnique({ where: { keyHash } });
  if (!record || !record.isActive) return null;
  if (record.expiresAt && record.expiresAt < new Date()) return null;

  // Fire-and-forget update lastUsedAt
  prisma.apiKey.update({ where: { id: record.id }, data: { lastUsedAt: new Date() } }).catch(() => {});

  return { userId: record.createdBy };
}
