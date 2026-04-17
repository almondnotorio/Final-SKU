// Deterministic natural language order parser — no AI, no external deps.
// Works in both browser and Node.js environments.

export type MountingType = "POST" | "WALL" | "PEDESTAL" | "IN_GROUND" | "SURFACE" | "RECESSED";

export interface ParsedOrderAttributes {
  // SKU-matchable fields
  color?: string;
  material?: string;
  finish?: string;
  mountingType?: MountingType;
  numberOfDoors?: number;
  lockType?: string;
  postalApproved?: boolean;
  category?: string;
  quantity?: number;
  // Dimension fields
  width?: number;
  height?: number;
  thickness?: number;
  // Signage-specific (not in mailbox catalog → flags)
  reflectivity?: string;
  sides?: number;
  // Operational (not catalog → flags)
  rushDelivery?: boolean;
}

export interface ParseResult {
  attributes: ParsedOrderAttributes;
  flags: string[];
  normalized: string;
}

// ─── Abbreviation expansion map ──────────────────────────────────────────────

const ABBREV_MAP: [RegExp, string][] = [
  [/\bw\/o\b/gi, "without"],
  [/\bw\//gi, "with"],
  [/\bdbl\b/gi, "double"],
  [/\bsgl\b/gi, "single"],
  [/\bqty\b/gi, "quantity"],
  [/\balum\b/gi, "aluminum"],
  [/\balm\b/gi, "aluminum"],
  [/\bgalv\b/gi, "galvanized"],
  [/\bgal st\b/gi, "galvanized steel"],
  [/\bstl\b/gi, "steel"],
  [/\banod\b/gi, "anodized"],
  [/\bamd\b/gi, "anodized"],
  [/\bpnt\b/gi, "powder coat"],
  [/\bpwd coat\b/gi, "powder coat"],
  [/\bpc\b(?=\s|$)/gi, "powder coat"],
  [/\busps\b/gi, "postal approved"],
  [/\bp\/a\b/gi, "postal approved"],
  [/\bhip\b/gi, "hip reflectivity"],
  [/\beng grade\b/gi, "engineer grade"],
  [/\begp\b/gi, "engineer grade"],
  [/\b4c\b/gi, "4c cluster"],
  [/\bstd[- ]4c\b/gi, "postal approved"],
  [/\bpedmt\b/gi, "pedestal"],
  [/\bwallmt\b/gi, "wall mount"],
  [/\bpostmt\b/gi, "post mount"],
  [/\bingrd\b/gi, "in ground"],
  [/\bsfc\b/gi, "surface"],
  [/\brecmtd\b/gi, "recessed"],
  [/\bbrz\b/gi, "bronze"],
  [/\bblk\b/gi, "black"],
  [/\bwht\b/gi, "white"],
  [/\bhd\b/gi, "heavy duty"],
];

// ─── normalizeInput ───────────────────────────────────────────────────────────

export function normalizeInput(raw: string): string {
  let s = raw.toLowerCase().trim();
  // Collapse whitespace
  s = s.replace(/\s+/g, " ");
  // Normalize number commas: 1,000 → 1000
  s = s.replace(/(\d),(\d{3})/g, "$1$2");
  // Normalize dimension separators: 6"x18", 6 X 18, 6×18 → 6x18
  s = s.replace(/(\d+(?:\.\d+)?)\s*["']?\s*[xX×]\s*["']?\s*(\d+(?:\.\d+)?)/g, "$1x$2");
  // Expand abbreviations
  for (const [pattern, replacement] of ABBREV_MAP) {
    s = s.replace(pattern, replacement);
  }
  // Collapse whitespace again after replacements
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

// ─── Keyword dict helpers ─────────────────────────────────────────────────────

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchDict<T extends string>(
  text: string,
  dict: Record<string, string[]>
): T | undefined {
  // Flatten and sort by variant length descending (longest match first)
  const entries = (Object.entries(dict) as [string, string[]][])
    .flatMap(([canonical, variants]) =>
      variants.map((v) => ({ canonical, variant: v }))
    )
    .sort((a, b) => b.variant.length - a.variant.length);

  for (const { canonical, variant } of entries) {
    const re = new RegExp(`\\b${escapeRegex(variant)}\\b`, "i");
    if (re.test(text)) return canonical as T;
  }
  return undefined;
}

// ─── Keyword dictionaries ─────────────────────────────────────────────────────

const COLOR_DICT: Record<string, string[]> = {
  Black:     ["black", "blk", "matte black", "gloss black"],
  Bronze:    ["bronze", "dark bronze", "oil rubbed bronze", "brz"],
  Sandstone: ["sandstone", "sand stone", "sand", "tan", "beige"],
  White:     ["white", "wht", "gloss white"],
  Silver:    ["silver", "grey anodized", "gray anodized", "aluminum silver"],
};

const MATERIAL_DICT: Record<string, string[]> = {
  "Galvanized Steel": ["galvanized steel", "galv steel", "galvanized", "steel"],
  "Aluminum":         ["aluminum", "aluminium", "alum"],
  "Stainless Steel":  ["stainless steel", "stainless"],
  "Plastic":          ["plastic", "poly", "hdpe"],
};

const FINISH_DICT: Record<string, string[]> = {
  "Powder Coat": ["powder coat", "powder coated", "powder-coat", "powdercoat"],
  "Anodized":    ["anodized", "anodised", "anod"],
  "Painted":     ["painted", "paint finish"],
  "Raw":         ["raw", "unfinished", "bare metal"],
};

const MOUNTING_DICT: Record<string, string[]> = {
  POST:      ["post mount", "post mounted", "post-mount", "on post", "mounted on post"],
  WALL:      ["wall mount", "wall mounted", "wall-mount", "wall hung", "surface wall"],
  PEDESTAL:  ["pedestal mount", "pedestal mounted", "pedestal base", "pedestal", "freestanding"],
  IN_GROUND: ["in ground", "in-ground", "ground mount", "ground mounted"],
  SURFACE:   ["surface mount", "surface mounted", "surface-mount"],
  RECESSED:  ["recessed", "flush mount", "flush-mount", "flush mounted"],
};

const LOCK_DICT: Record<string, string[]> = {
  "Arrow Lock + Tenant Cam Lock": [
    "arrow lock", "arrow", "usps lock", "carrier lock",
    "cluster lock", "4c lock", "arrow lock tenant",
  ],
  "Cam Lock": ["cam lock", "cam", "standard lock", "t3 lock", "t3"],
  "Keyed":    ["keyed", "key lock", "keyed lock", "keyed entry"],
};

const CATEGORY_DICT: Record<string, string[]> = {
  "Residential Mailboxes": [
    "residential", "single family", "single-family", "home mailbox",
    "house mailbox", "standard mailbox", "t1", "t2",
  ],
  "Community / Cluster": [
    "community", "cluster", "cluster mailbox", "apartment", "hoa",
    "multi-unit", "multi unit", "condo", "townhome",
    "4c cluster", "16 door", "8 door", "16-door", "8-door",
  ],
  "Commercial": [
    "commercial", "business mailbox", "office mailbox",
    "heavy duty mailbox", "industrial mailbox",
  ],
  "Accessories & Parts": [
    "replacement part", "accessory", "accessories", "hardware",
    "lock replacement", "pedestal base", "mounting bracket",
  ],
};

const REFLECTIVITY_DICT: Record<string, string[]> = {
  "HIP":            ["hip reflectivity", "high intensity prismatic", "h.i.p.", "hip"],
  "Engineer Grade": ["engineer grade", "engineering grade", "eng grade"],
  "Diamond Grade":  ["diamond grade", "dg"],
  "Standard":       ["standard reflective", "non-reflective", "flat reflective"],
};

const SIDES_DICT: Record<string, string[]> = {
  "2": ["double sided", "double-sided", "two sided", "two-sided", "2 sided", "2-sided", "both sides"],
  "1": ["single sided", "single-sided", "one sided", "one-sided", "1 sided", "1-sided"],
};

// ─── parseOrder ───────────────────────────────────────────────────────────────

export function parseOrder(normalized: string): ParseResult {
  const attrs: ParsedOrderAttributes = {};
  const flags: string[] = [];

  // ── Regex extractors ──

  // Size: "6x18" → width=6, height=18
  const sizeMatch = normalized.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/i);
  if (sizeMatch) {
    attrs.width = parseFloat(sizeMatch[1]);
    attrs.height = parseFloat(sizeMatch[2]);
  }

  // Thickness: ".040", ".063"
  const thickMatch = normalized.match(/\.0\d{2,3}\b/);
  if (thickMatch) {
    attrs.thickness = parseFloat(thickMatch[0]);
  }

  // Quantity: "4x", "qty 4", "6 units", "3 pieces"
  const qtyMatch =
    normalized.match(/\b(\d+)\s*(?:x\b|qty|quantity)/i) ||
    normalized.match(/\b(\d+)\s+(?:units?|pcs?|pieces?|mailboxes?|boxes?)\b/i);
  if (qtyMatch) {
    const q = parseInt(qtyMatch[1]);
    if (q > 0 && q < 10000) attrs.quantity = q;
  }

  // Number of doors: "16-door", "16 doors", "8door"
  const doorMatch = normalized.match(/\b(\d+)[- ]?door(?:s)?\b/i);
  if (doorMatch) {
    attrs.numberOfDoors = parseInt(doorMatch[1]);
  }

  // Rush delivery
  if (/\brush\b|\bexpedit|\bsame[- ]day\b|\basap\b/i.test(normalized)) {
    attrs.rushDelivery = true;
  }

  // Postal approved
  if (/\bpostal[- ]?approved\b|\busps[- ]?approved\b|\bmeets\s+4c\b|\bstd[- ]4c\b/i.test(normalized)) {
    attrs.postalApproved = true;
  }

  // ── Keyword dict extractors ──

  const color = matchDict<string>(normalized, COLOR_DICT);
  if (color) attrs.color = color;

  const material = matchDict<string>(normalized, MATERIAL_DICT);
  if (material) attrs.material = material;

  const finish = matchDict<string>(normalized, FINISH_DICT);
  if (finish) attrs.finish = finish;

  const mountingType = matchDict<MountingType>(normalized, MOUNTING_DICT);
  if (mountingType) attrs.mountingType = mountingType;

  const lockType = matchDict<string>(normalized, LOCK_DICT);
  if (lockType) attrs.lockType = lockType;

  // Category: only match if not already covered by a more specific attribute
  const category = matchDict<string>(normalized, CATEGORY_DICT);
  if (category) attrs.category = category;

  // Reflectivity (signage-specific)
  const reflectivity = matchDict<string>(normalized, REFLECTIVITY_DICT);
  if (reflectivity) attrs.reflectivity = reflectivity;

  // Sides (signage-specific)
  const sidesKey = matchDict<string>(normalized, SIDES_DICT);
  if (sidesKey) attrs.sides = parseInt(sidesKey);

  // ── Lock keyword fallback ──
  // "with lock" or "lock" without specific type → default to Cam Lock
  if (!attrs.lockType && /\bwith lock\b|\bhas lock\b|\blocked\b|\binclude lock\b/i.test(normalized)) {
    attrs.lockType = "Cam Lock";
  }

  // ── Flag generation ──

  if (attrs.rushDelivery) {
    flags.push("Rush delivery is not a catalog attribute");
  }

  if (attrs.reflectivity) {
    flags.push(`Reflectivity (${attrs.reflectivity}) is a signage attribute — not in mailbox catalog`);
  }

  if (attrs.sides) {
    flags.push(`${attrs.sides === 2 ? "Double" : "Single"}-sided specification is a signage attribute`);
  }

  if (attrs.thickness && !attrs.color && !attrs.material && !attrs.mountingType && !attrs.numberOfDoors) {
    flags.push("Thickness specified — this looks like a signage order, not a catalog product");
  }

  if (attrs.quantity) {
    flags.push(`Quantity (${attrs.quantity}) noted — not used for SKU matching`);
  }

  const hasMatchableAttrs =
    attrs.color || attrs.material || attrs.finish || attrs.mountingType ||
    attrs.numberOfDoors || attrs.lockType || attrs.postalApproved !== undefined ||
    attrs.category;

  if (!hasMatchableAttrs && !attrs.width && !attrs.height) {
    flags.push("Unable to extract any matchable attributes from this order");
  }

  return { attributes: attrs, flags, normalized };
}

// ─── Utility: convert ParsedOrderAttributes to display-friendly key/value pairs ──

export function attrsToEntries(
  attrs: ParsedOrderAttributes
): { key: string; label: string; value: string; isFlag: boolean }[] {
  const CATALOG_KEYS = new Set([
    "color", "material", "finish", "mountingType", "numberOfDoors",
    "lockType", "postalApproved", "category", "width", "height",
  ]);
  const FLAG_KEYS = new Set(["rushDelivery", "reflectivity", "sides", "thickness", "quantity"]);

  const LABELS: Record<string, string> = {
    color: "Color", material: "Material", finish: "Finish",
    mountingType: "Mount", numberOfDoors: "Doors", lockType: "Lock",
    postalApproved: "Postal Approved", category: "Category",
    width: "Width (in)", height: "Height (in)", thickness: "Thickness (in)",
    reflectivity: "Reflectivity", sides: "Sides", rushDelivery: "Rush Delivery",
    quantity: "Quantity",
  };

  return (Object.entries(attrs) as [string, unknown][])
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([key, value]) => ({
      key,
      label: LABELS[key] ?? key,
      value: String(value),
      isFlag: FLAG_KEYS.has(key) && !CATALOG_KEYS.has(key),
    }));
}
