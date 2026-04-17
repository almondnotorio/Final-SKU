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

// ─── Name word-overlap matching ───────────────────────────────────────────────

function nameMatch(skuName: string, normalizedInput: string): boolean {
  if (!normalizedInput.trim()) return false;
  const inputWords = normalizedInput
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .map((w) => w.replace(/[^a-z0-9]/g, ""));
  const nameWords = skuName
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z0-9]/g, ""))
    .filter((w) => w.length > 3);
  return nameWords.some((nw) => inputWords.some((iw) => nw.includes(iw) || iw.includes(nw)));
}

// ─── scoreSKU ─────────────────────────────────────────────────────────────────

function scoreSKU(
  attrs: ParsedOrderAttributes,
  sku: MatchableSKU,
  normalizedInput: string
): ScoredSKU {
  const matched: string[] = [];
  const unmatched: string[] = [];

  // ── Build attributeGrid for the 9 display fields (8 + name) ──
  const nameMatched = nameMatch(sku.name, normalizedInput);

  const attributeGrid: AttributeMatchDetail[] = [
    {
      key: "name", label: "Name",
      skuValue: sku.name,
      orderedValue: normalizedInput.trim() ? normalizedInput.trim() : null,
      matched: normalizedInput.trim() ? nameMatched : null,
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
  ];

  // ── Score = matched / specified (count-based percentage) ──
  const specified = attributeGrid.filter((a) => a.matched !== null);
  const matchedCount = specified.filter((a) => a.matched === true).length;

  specified.forEach((a) => {
    if (a.matched === true) matched.push(a.key);
    else unmatched.push(a.key);
  });

  const finalScore = specified.length > 0 ? matchedCount / specified.length : 0;
  const status: ScoredSKU["status"] =
    finalScore >= 0.75 ? "MATCHED" : finalScore >= 0.4 ? "PARTIAL_MATCH" : "NO_MATCH";

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
