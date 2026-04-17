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
  depth: number | null;
  weight: number | null;
}

export interface AttributeMatchDetail {
  key: string;
  label: string;
  skuValue: string | null;      // what the SKU has
  orderedValue: string | null;  // what was ordered (null = not specified)
  matched: boolean | null;      // null = not specified in order
}

export interface ScoredSKU {
  sku: MatchableSKU;
  score: number;
  status: "MATCHED" | "PARTIAL_MATCH" | "NO_MATCH";
  matchedAttributes: string[];
  unmatchedAttributes: string[];
  attributeGrid: AttributeMatchDetail[];
}

// ─── Weight table ─────────────────────────────────────────────────────────────
// Primary 8 fields requested by user + secondary supporting fields.

const WEIGHTS: Record<string, number> = {
  // Primary 8
  mountingType:   0.18,
  color:          0.14,
  material:       0.14,
  finish:         0.10,
  width:          0.10,
  height:         0.10,
  depth:          0.07,
  weight:         0.07,
  // Secondary
  category:       0.05,
  numberOfDoors:  0.05,
  lockType:       0.03,
  postalApproved: 0.02,
  tags:           0.05,
};

// Dimension match tolerance: within ±15%
const DIM_TOLERANCE = 0.15;

function normStr(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().trim();
}

function dimMatch(ordered: number, skuVal: number | null): boolean {
  if (skuVal == null) return false;
  return Math.abs(skuVal - ordered) / ordered <= DIM_TOLERANCE;
}

function fmtNum(v: number | null, unit: string): string | null {
  if (v == null) return null;
  return `${v}${unit}`;
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

  function score(key: string, isMatch: boolean) {
    const w = WEIGHTS[key] ?? 0;
    denominator += w;
    if (isMatch) { rawScore += w; matched.push(key); }
    else { unmatched.push(key); }
  }

  // ── Primary 8 fields ──

  if (attrs.mountingType)
    score("mountingType", normStr(sku.mountingType) === normStr(attrs.mountingType));

  if (attrs.color)
    score("color", normStr(sku.color) === normStr(attrs.color));

  if (attrs.material)
    score("material", normStr(sku.material) === normStr(attrs.material));

  if (attrs.finish)
    score("finish", normStr(sku.finish) === normStr(attrs.finish));

  if (attrs.width !== undefined)
    score("width", dimMatch(attrs.width, sku.width));

  if (attrs.height !== undefined)
    score("height", dimMatch(attrs.height, sku.height));

  if (attrs.depth !== undefined)
    score("depth", dimMatch(attrs.depth, sku.depth));

  if (attrs.weight !== undefined)
    score("weight", dimMatch(attrs.weight, sku.weight));

  // ── Secondary fields ──

  if (attrs.category) {
    const cn = normStr(sku.category.name);
    const ca = normStr(attrs.category);
    score("category", cn === ca || cn.includes(ca) || ca.includes(cn));
  }

  if (attrs.numberOfDoors !== undefined)
    score("numberOfDoors", sku.numberOfDoors === attrs.numberOfDoors);

  if (attrs.lockType)
    score("lockType", normStr(sku.lockType) === normStr(attrs.lockType));

  if (attrs.postalApproved !== undefined)
    score("postalApproved", sku.postalApproved === attrs.postalApproved);

  // ── Tags keyword overlap bonus ──
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
    rawScore += tagRatio * WEIGHTS.tags;
    denominator += WEIGHTS.tags;
    if (tagHits.length > 0) matched.push(`tags:${tagHits.slice(0, 2).join(",")}`);
  }

  const finalScore = denominator > 0 ? Math.min(rawScore / denominator, 1.0) : 0;
  const status: ScoredSKU["status"] =
    finalScore >= 0.75 ? "MATCHED" : finalScore >= 0.4 ? "PARTIAL_MATCH" : "NO_MATCH";

  // ── Build attributeGrid for the 8 display fields ──
  const attributeGrid: AttributeMatchDetail[] = [
    {
      key: "width", label: "Width",
      skuValue: fmtNum(sku.width, " cm"),
      orderedValue: attrs.width !== undefined ? `${attrs.width} cm` : null,
      matched: attrs.width !== undefined ? dimMatch(attrs.width, sku.width) : null,
    },
    {
      key: "height", label: "Height",
      skuValue: fmtNum(sku.height, " cm"),
      orderedValue: attrs.height !== undefined ? `${attrs.height} cm` : null,
      matched: attrs.height !== undefined ? dimMatch(attrs.height, sku.height) : null,
    },
    {
      key: "depth", label: "Depth",
      skuValue: fmtNum(sku.depth, " cm"),
      orderedValue: attrs.depth !== undefined ? `${attrs.depth} cm` : null,
      matched: attrs.depth !== undefined ? dimMatch(attrs.depth, sku.depth) : null,
    },
    {
      key: "weight", label: "Weight",
      skuValue: fmtNum(sku.weight, " kg"),
      orderedValue: attrs.weight !== undefined ? `${attrs.weight} kg` : null,
      matched: attrs.weight !== undefined ? dimMatch(attrs.weight, sku.weight) : null,
    },
    {
      key: "color", label: "Color",
      skuValue: sku.color,
      orderedValue: attrs.color ?? null,
      matched: attrs.color !== undefined ? normStr(sku.color) === normStr(attrs.color) : null,
    },
    {
      key: "material", label: "Material",
      skuValue: sku.material,
      orderedValue: attrs.material ?? null,
      matched: attrs.material !== undefined ? normStr(sku.material) === normStr(attrs.material) : null,
    },
    {
      key: "finish", label: "Finish",
      skuValue: sku.finish,
      orderedValue: attrs.finish ?? null,
      matched: attrs.finish !== undefined ? normStr(sku.finish) === normStr(attrs.finish) : null,
    },
    {
      key: "mountingType", label: "Mounting",
      skuValue: sku.mountingType,
      orderedValue: attrs.mountingType ?? null,
      matched: attrs.mountingType !== undefined ? normStr(sku.mountingType) === normStr(attrs.mountingType) : null,
    },
  ];

  return { sku, score: finalScore, status, matchedAttributes: matched, unmatchedAttributes: unmatched, attributeGrid };
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
