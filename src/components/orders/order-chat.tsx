"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  X, Plus, Send, Loader2, Package, AlertTriangle,
  CheckCircle2, HelpCircle, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { normalizeInput, parseOrder, attrsToEntries, type ParsedOrderAttributes } from "@/lib/order-parser";
import { matchSKUs, type MatchableSKU, type ScoredSKU } from "@/lib/sku-matcher";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AttributeChip {
  id: string;
  key: string;
  label: string;
  value: string;
  isFlag: boolean;
  isManual: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function chipsToAttrs(chips: AttributeChip[]): ParsedOrderAttributes {
  const attrs: Record<string, unknown> = {};
  for (const chip of chips) {
    if (chip.isFlag) continue;
    const v = chip.value;
    if (chip.key === "numberOfDoors" || chip.key === "quantity" || chip.key === "sides") {
      attrs[chip.key] = parseInt(v);
    } else if (chip.key === "width" || chip.key === "height" || chip.key === "thickness") {
      attrs[chip.key] = parseFloat(v);
    } else if (chip.key === "postalApproved" || chip.key === "rushDelivery") {
      attrs[chip.key] = v === "true" || v === "yes" || v === "1";
    } else {
      attrs[chip.key] = v;
    }
  }
  return attrs as ParsedOrderAttributes;
}

function attrsToChips(attrs: ParsedOrderAttributes, manualChips: AttributeChip[]): AttributeChip[] {
  const manualKeys = new Set(manualChips.map((c) => c.key));
  const entries = attrsToEntries(attrs).filter((e) => !manualKeys.has(e.key));
  return entries.map((e) => ({
    id: uid(),
    key: e.key,
    label: e.label,
    value: e.value,
    isFlag: e.isFlag,
    isManual: false,
  }));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ChipItem({
  chip,
  onRemove,
}: {
  chip: AttributeChip;
  onRemove: (id: string) => void;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        chip.isFlag
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : chip.isManual
          ? "border-blue-200 bg-blue-50 text-blue-700"
          : "border-secondary bg-secondary text-secondary-foreground"
      )}
    >
      <span className="opacity-60 capitalize">{chip.label}:</span>
      <span>{chip.value}</span>
      <button
        onClick={() => onRemove(chip.id)}
        className="ml-0.5 rounded-full hover:opacity-70 transition-opacity"
        aria-label={`Remove ${chip.label}`}
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </span>
  );
}

function AddChipForm({ onAdd }: { onAdd: (key: string, value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const keyRef = useRef<HTMLInputElement>(null);

  function handleAdd() {
    const k = key.trim();
    const v = value.trim();
    if (!k || !v) return;
    onAdd(k, v);
    setKey("");
    setValue("");
    setOpen(false);
  }

  useEffect(() => {
    if (open) keyRef.current?.focus();
  }, [open]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-full border border-dashed px-2.5 py-0.5 text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors"
      >
        <Plus className="h-3 w-3" /> Add
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5">
      <input
        ref={keyRef}
        value={key}
        onChange={(e) => setKey(e.target.value)}
        placeholder="key"
        className="w-16 text-xs outline-none bg-transparent"
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
      />
      <span className="text-muted-foreground text-xs">:</span>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="value"
        className="w-20 text-xs outline-none bg-transparent"
        onKeyDown={(e) => {
          if (e.key === "Enter") handleAdd();
          if (e.key === "Escape") setOpen(false);
        }}
      />
      <button onClick={handleAdd} className="text-primary hover:opacity-70">
        <Plus className="h-3 w-3" />
      </button>
      <button onClick={() => setOpen(false)} className="text-muted-foreground hover:opacity-70">
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

const SCORE_CONFIG = {
  high:   { className: "bg-emerald-500", label: "MATCHED",       Icon: CheckCircle2, textCls: "text-emerald-700" },
  mid:    { className: "bg-amber-500",   label: "PARTIAL MATCH", Icon: HelpCircle,   textCls: "text-amber-700" },
  low:    { className: "bg-red-400",     label: "NO MATCH",      Icon: XCircle,      textCls: "text-red-600" },
};

function SKUMatchCard({ scored, rank }: { scored: ScoredSKU; rank: number }) {
  const pct = Math.round(scored.score * 100);
  const tier = pct >= 75 ? "high" : pct >= 40 ? "mid" : "low";
  const cfg = SCORE_CONFIG[tier];
  const Icon = cfg.Icon;

  return (
    <div className="rounded-lg border bg-card p-3 space-y-2.5">
      <div className="flex items-start gap-2.5">
        {/* Rank */}
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
          {rank}
        </span>

        {/* Thumbnail */}
        {scored.sku.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={scored.sku.thumbnail}
            alt={scored.sku.name}
            className="h-10 w-10 rounded object-cover shrink-0"
          />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-muted">
            <Package className="h-4 w-4 text-muted-foreground" />
          </div>
        )}

        {/* Name + SKU */}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground truncate">{scored.sku.category.name}</p>
          <p className="text-sm font-semibold leading-tight truncate">{scored.sku.name}</p>
          <p className="text-xs font-mono text-muted-foreground">{scored.sku.sku}</p>
        </div>

        {/* Score badge */}
        <div className={cn("flex flex-col items-end shrink-0", cfg.textCls)}>
          <span className="text-base font-bold leading-none">{pct}%</span>
          <div className={cn("flex items-center gap-0.5 text-[10px] font-medium mt-0.5")}>
            <Icon className="h-2.5 w-2.5" />
            {cfg.label}
          </div>
        </div>
      </div>

      {/* Score bar */}
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-300", cfg.className)}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Matched / unmatched chips */}
      {(scored.matchedAttributes.length > 0 || scored.unmatchedAttributes.length > 0) && (
        <div className="flex flex-wrap gap-1">
          {scored.matchedAttributes.map((a) => (
            <span key={a} className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[10px] text-emerald-700">
              <CheckCircle2 className="h-2.5 w-2.5" /> {a}
            </span>
          ))}
          {scored.unmatchedAttributes.map((a) => (
            <span key={a} className="inline-flex items-center gap-0.5 rounded-full bg-muted border px-1.5 py-0.5 text-[10px] text-muted-foreground line-through">
              {a}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

const EXAMPLES = [
  "Community cluster mailbox, 16 doors, pedestal mount, postal approved",
  "4 residential mailboxes, bronze finish, wall mount, with lock",
  "We need 6x18 signage, .040 thickness, HIP reflectivity, double sided, rush delivery",
];

// ─── Main component ───────────────────────────────────────────────────────────

export function OrderChat() {
  const [rawInput, setRawInput] = useState("");
  const [chips, setChips] = useState<AttributeChip[]>([]);
  const [flags, setFlags] = useState<string[]>([]);
  const [normalizedStr, setNormalizedStr] = useState("");
  const [skus, setSkus] = useState<MatchableSKU[]>([]);
  const [skusLoading, setSkusLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Fetch SKUs once on mount
  useEffect(() => {
    setSkusLoading(true);
    fetch("/api/skus?limit=100&status=ACTIVE")
      .then((r) => r.json())
      .then((d) => {
        const raw = (d.data ?? []) as Array<Record<string, unknown>>;
        setSkus(
          raw.map((s) => ({
            id: s.id as string,
            sku: s.sku as string,
            name: s.name as string,
            thumbnail: (s.thumbnail as string | null) ?? null,
            retailPrice: Number(s.retailPrice),
            category: s.category as { name: string },
            color: (s.color as string | null) ?? null,
            material: (s.material as string | null) ?? null,
            finish: (s.finish as string | null) ?? null,
            mountingType: (s.mountingType as string | null) ?? null,
            numberOfDoors: (s.numberOfDoors as number | null) ?? null,
            lockType: (s.lockType as string | null) ?? null,
            postalApproved: Boolean(s.postalApproved),
            tags: (s.tags as string[]) ?? [],
            features: (s.features as string[]) ?? [],
            width: s.width ? Number(s.width) : null,
            height: s.height ? Number(s.height) : null,
          }))
        );
      })
      .catch(console.error)
      .finally(() => setSkusLoading(false));
  }, []);

  function handleParse() {
    if (!rawInput.trim()) {
      setChips([]);
      setFlags([]);
      setNormalizedStr("");
      return;
    }
    const norm = normalizeInput(rawInput);
    const { attributes, flags: newFlags } = parseOrder(norm);
    setNormalizedStr(norm);
    setFlags(newFlags);
    setChips((prev) => {
      const manualChips = prev.filter((c) => c.isManual);
      return [...attrsToChips(attributes, manualChips), ...manualChips];
    });
  }

  // Live SKU scoring (synchronous, via useMemo)
  const scoredSKUs = useMemo<ScoredSKU[]>(() => {
    if (skus.length === 0 || chips.length === 0) return [];
    const attrs = chipsToAttrs(chips);
    return matchSKUs(attrs, skus, normalizedStr);
  }, [chips, skus, normalizedStr]);

  function removeChip(id: string) {
    setChips((prev) => prev.filter((c) => c.id !== id));
  }

  function addChip(key: string, value: string) {
    const LABELS: Record<string, string> = {
      color: "Color", material: "Material", finish: "Finish",
      mountingType: "Mount", numberOfDoors: "Doors", lockType: "Lock",
      postalApproved: "Postal Approved", category: "Category",
      width: "Width", height: "Height",
    };
    setChips((prev) => [
      ...prev,
      {
        id: uid(),
        key,
        label: LABELS[key] ?? key,
        value,
        isFlag: false,
        isManual: true,
      },
    ]);
  }

  async function handleSubmit() {
    const catalogChips = chips.filter((c) => !c.isFlag);
    if (catalogChips.length === 0) return;

    setSubmitting(true);
    setSubmitError(null);
    setSubmitted(false);

    try {
      const attrs = chipsToAttrs(catalogChips);
      const topMatch = scoredSKUs[0];
      const matchedSkuId = topMatch?.score >= 0.4 ? topMatch.sku.id : null;

      const res = await fetch("/api/orders/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawInput, parsedAttributes: attrs, matchedSkuId }),
      });

      if (!res.ok) {
        const data = await res.json();
        setSubmitError(data.error ?? "Failed to save order");
        return;
      }

      setSubmitted(true);
      setRawInput("");
      setChips([]);
      setFlags([]);
    } catch {
      setSubmitError("Network error — please try again");
    } finally {
      setSubmitting(false);
    }
  }

  const catalogChips = chips.filter((c) => !c.isFlag);
  const flagChips = chips.filter((c) => c.isFlag);
  const allFlags = [
    ...flags,
    ...flagChips.map((c) => `${c.label}: ${c.value}`),
  ];
  const topSKUs = scoredSKUs.slice(0, 6);
  const hasInput = rawInput.trim().length > 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 h-full divide-y md:divide-y-0 md:divide-x">

      {/* ── LEFT PANEL: Input + Chips ── */}
      <div className="flex flex-col h-full min-h-0">
        {/* Textarea */}
        <div className="p-4 shrink-0">
          <textarea
            value={rawInput}
            onChange={(e) => { setRawInput(e.target.value); setSubmitted(false); }}
            onKeyDown={(e) => { if (e.key === "Enter" && e.shiftKey) { e.preventDefault(); handleParse(); } }}
            placeholder="Describe your order in plain language… (Shift+Enter to parse)"
            rows={5}
            className="w-full resize-none rounded-xl border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />

          <Button
            variant="outline"
            size="sm"
            onClick={handleParse}
            disabled={!rawInput.trim()}
            className="mt-2 w-full"
          >
            Parse Order
          </Button>

          {/* Example prompts */}
          {!hasInput && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => { setRawInput(ex); }}
                  className="text-xs rounded-full border border-dashed px-2.5 py-0.5 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  {ex.length > 52 ? ex.slice(0, 52) + "…" : ex}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Chips area */}
        <div className="flex-1 overflow-y-auto px-4 pb-2">
          {hasInput && (
            <>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Parsed Attributes
                <span className="ml-1.5 font-normal normal-case opacity-60">
                  — remove or add chips to refine matching
                </span>
              </p>

              {catalogChips.length === 0 && allFlags.length === 0 && (
                <p className="text-xs text-muted-foreground italic">
                  No matchable attributes detected yet…
                </p>
              )}

              <div className="flex flex-wrap gap-1.5 mb-3">
                {catalogChips.map((chip) => (
                  <ChipItem key={chip.id} chip={chip} onRemove={removeChip} />
                ))}
                <AddChipForm onAdd={addChip} />
              </div>

              {/* Flags */}
              {allFlags.length > 0 && (
                <div className="space-y-1">
                  {allFlags.map((flag, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-1.5 rounded-md bg-amber-50 border border-amber-100 px-2.5 py-1.5 text-xs text-amber-700"
                    >
                      <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                      {flag}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Submit */}
        <div className="border-t p-4 shrink-0">
          {submitted && (
            <p className="text-xs text-emerald-600 flex items-center gap-1 mb-2">
              <CheckCircle2 className="h-3.5 w-3.5" /> Order saved successfully.
            </p>
          )}
          {submitError && (
            <p className="text-xs text-destructive mb-2">{submitError}</p>
          )}
          <Button
            onClick={handleSubmit}
            disabled={submitting || catalogChips.length === 0}
            className="w-full"
          >
            {submitting ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</>
            ) : (
              <><Send className="h-4 w-4 mr-2" /> Save Order</>
            )}
          </Button>
        </div>
      </div>

      {/* ── RIGHT PANEL: SKU Matcher ── */}
      <div className="flex flex-col h-full min-h-0">
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <h2 className="text-sm font-semibold">SKU Matches</h2>
          {!skusLoading && skus.length > 0 && (
            <span className="text-xs text-muted-foreground">{skus.length} active SKUs</span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {skusLoading && (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span className="text-sm">Loading catalog…</span>
            </div>
          )}

          {!skusLoading && !hasInput && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-8 w-8 text-muted-foreground mb-2 opacity-40" />
              <p className="text-sm text-muted-foreground">
                Start typing to see matching SKUs
              </p>
            </div>
          )}

          {!skusLoading && hasInput && topSKUs.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-12">
              No SKUs available
            </p>
          )}

          {!skusLoading && topSKUs.map((s, i) => (
            <SKUMatchCard key={s.sku.id} scored={s} rank={i + 1} />
          ))}
        </div>
      </div>
    </div>
  );
}
