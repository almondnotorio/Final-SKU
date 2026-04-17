// Deterministic SKU scoring/matching — pure functions, browser-compatible.

import type { ParsedOrderAttributes } from "./order-parser";

export interface MatchableSKU {
  id: string;
  sku: string;
  name: string;
  thumbnail: string | null;
  retailPrice: number;
  category: { name: string };
  color: string | null;
  material: string | null;
  finish: string | null;
  mountingType: string | null;
  numberOfDoors: number | null;
  lockType: string | null;
  postalApproved: boolean;
  tags: string[];
  features: string[];
  width: number | null;
  height: number | null;
}

export interface ScoredSKU {
  sku: MatchableSKU;
  score: number;
  status: "MATCHED" | "PARTIAL_MATCH" | "NO_MATCH";
  matchedAttributes: string[];
  unmatchedAttributes: string[];
}

// ─── Weight table ─────────────────────────────────────────────────────────────
// Only attributes present in ParsedOrderAttributes contribute to the denominator.

const WEIGHTS: Record<string, number> = {
  category:       0.30,
  mountingType:   0.20,
  numberOfDoors:  0.15,
  color:          0.10,
  material:       0.10,
  finish:         0.05,
  lockType:       0.05,
  postalApproved: 0.05,
  tags:           0.10,
};

function norm(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().trim();
}

// ─── scoreSKU ─────────────────────────────────────────────────────────────────

function scoreSKU(
  attrs: ParsedOrderAttributes,
  sku: MatchableSKU,
  normalizedInput: string
): ScoredSKU {
  let rawScore = 0;
  let denominator = 0;
  const matched: string[] = [];
  const unmatched: string[] = [];

  // ── category ──
  if (attrs.category) {
    denominator += WEIGHTS.category;
    if (norm(sku.category.name) === norm(attrs.category) ||
        norm(sku.category.name).includes(norm(attrs.category)) ||
        norm(attrs.category).includes(norm(sku.category.name))) {
      rawScore += WEIGHTS.category;
      matched.push("category");
    } else {
      unmatched.push("category");
    }
  }

  // ── mountingType ──
  if (attrs.mountingType) {
    denominator += WEIGHTS.mountingType;
    if (norm(sku.mountingType) === norm(attrs.mountingType)) {
      rawScore += WEIGHTS.mountingType;
      matched.push("mountingType");
    } else {
      unmatched.push("mountingType");
    }
  }

  // ── numberOfDoors ──
  if (attrs.numberOfDoors !== undefined) {
    denominator += WEIGHTS.numberOfDoors;
    if (sku.numberOfDoors === attrs.numberOfDoors) {
      rawScore += WEIGHTS.numberOfDoors;
      matched.push("numberOfDoors");
    } else {
      unmatched.push("numberOfDoors");
    }
  }

  // ── color ──
  if (attrs.color) {
    denominator += WEIGHTS.color;
    if (norm(sku.color) === norm(attrs.color)) {
      rawScore += WEIGHTS.color;
      matched.push("color");
    } else {
      unmatched.push("color");
    }
  }

  // ── material ──
  if (attrs.material) {
    denominator += WEIGHTS.material;
    if (norm(sku.material) === norm(attrs.material)) {
      rawScore += WEIGHTS.material;
      matched.push("material");
    } else {
      unmatched.push("material");
    }
  }

  // ── finish ──
  if (attrs.finish) {
    denominator += WEIGHTS.finish;
    if (norm(sku.finish) === norm(attrs.finish)) {
      rawScore += WEIGHTS.finish;
      matched.push("finish");
    } else {
      unmatched.push("finish");
    }
  }

  // ── lockType ──
  if (attrs.lockType) {
    denominator += WEIGHTS.lockType;
    if (norm(sku.lockType) === norm(attrs.lockType)) {
      rawScore += WEIGHTS.lockType;
      matched.push("lockType");
    } else {
      unmatched.push("lockType");
    }
  }

  // ── postalApproved ──
  if (attrs.postalApproved !== undefined) {
    denominator += WEIGHTS.postalApproved;
    if (sku.postalApproved === attrs.postalApproved) {
      rawScore += WEIGHTS.postalApproved;
      matched.push("postalApproved");
    } else {
      unmatched.push("postalApproved");
    }
  }

  // ── tags: keyword overlap bonus ──
  if (sku.tags.length > 0) {
    const inputWords = normalizedInput
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .map((w) => w.replace(/[^a-z0-9]/g, ""));
    const skuTags = sku.tags.map((t) => t.toLowerCase().replace(/[^a-z0-9]/g, ""));
    const tagHits = skuTags.filter((tag) =>
      inputWords.some((w) => tag.includes(w) || w.includes(tag))
    );
    const tagRatio = tagHits.length / Math.max(skuTags.length, 1);
    const tagBonus = tagRatio * WEIGHTS.tags;
    rawScore += tagBonus;
    denominator += WEIGHTS.tags;
    if (tagHits.length > 0) {
      matched.push(`tags: ${tagHits.slice(0, 3).join(", ")}`);
    }
  }

  // ── dimension soft-mismatch note (no score penalty) ──
  if (attrs.width && attrs.height && sku.width && sku.height) {
    const widthOk = Math.abs(sku.width - attrs.width) / attrs.width < 0.2;
    const heightOk = Math.abs(sku.height - attrs.height) / attrs.height < 0.2;
    if (!widthOk || !heightOk) {
      unmatched.push("dimensions");
    }
  }

  const score = denominator > 0 ? Math.min(rawScore / denominator, 1.0) : 0;

  const status: ScoredSKU["status"] =
    score >= 0.75 ? "MATCHED" : score >= 0.4 ? "PARTIAL_MATCH" : "NO_MATCH";

  return { sku, score, status, matchedAttributes: matched, unmatchedAttributes: unmatched };
}

// ─── matchSKUs ────────────────────────────────────────────────────────────────

export function matchSKUs(
  attrs: ParsedOrderAttributes,
  skus: MatchableSKU[],
  normalizedInput: string
): ScoredSKU[] {
  if (skus.length === 0) return [];

  return skus
    .map((s) => scoreSKU(attrs, s, normalizedInput))
    .sort((a, b) => b.score - a.score);
}

// ─── Derive order status from top match ──────────────────────────────────────

export function deriveOrderStatus(
  topScore: number
): "MATCHED" | "PARTIAL_MATCH" | "NO_MATCH" {
  if (topScore >= 0.75) return "MATCHED";
  if (topScore >= 0.4) return "PARTIAL_MATCH";
  return "NO_MATCH";
}
