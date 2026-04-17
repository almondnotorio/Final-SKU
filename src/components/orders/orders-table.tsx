"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2,
  HelpCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Package,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type OrderStatus = "MATCHED" | "PARTIAL_MATCH" | "NO_MATCH" | "INVALID" | "PENDING";

interface MatchedSku {
  id: string;
  sku: string;
  name: string;
  thumbnail: string | null;
  retailPrice: number;
  category: { name: string };
}

interface Order {
  id: string;
  rawInput: string;
  parsedData: Record<string, unknown>;
  matchedSkuId: string | null;
  matchedSku: MatchedSku | null;
  confidence: number | null;
  status: OrderStatus;
  flags: string[];
  notes: string | null;
  userId: string | null;
  createdAt: string;
}

const STATUS_CONFIG: Record<OrderStatus, { label: string; icon: React.ElementType; className: string }> = {
  MATCHED: { label: "Matched", icon: CheckCircle2, className: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  PARTIAL_MATCH: { label: "Partial Match", icon: HelpCircle, className: "text-amber-700 bg-amber-50 border-amber-200" },
  NO_MATCH: { label: "No Match", icon: XCircle, className: "text-red-700 bg-red-50 border-red-200" },
  INVALID: { label: "Invalid", icon: AlertTriangle, className: "text-red-800 bg-red-100 border-red-300" },
  PENDING: { label: "Pending", icon: Loader2, className: "text-gray-600 bg-gray-50 border-gray-200" },
};

const STATUS_FILTERS: { label: string; value: string }[] = [
  { label: "All", value: "" },
  { label: "Matched", value: "MATCHED" },
  { label: "Partial Match", value: "PARTIAL_MATCH" },
  { label: "No Match", value: "NO_MATCH" },
  { label: "Invalid", value: "INVALID" },
];

function StatusBadge({ status }: { status: OrderStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium", cfg.className)}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

function ExpandedRow({ order }: { order: Order }) {
  const attrs = order.parsedData as Record<string, unknown>;

  return (
    <tr>
      <td colSpan={6} className="bg-muted/30 px-6 py-4 border-b">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Parsed attributes */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Extracted Attributes
            </p>
            {Object.keys(attrs).length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(attrs).map(([k, v]) => (
                  <span
                    key={k}
                    className="inline-flex items-center gap-1 rounded-full bg-background border px-2 py-0.5 text-xs"
                  >
                    <span className="text-muted-foreground capitalize">{k.replace(/_/g, " ")}:</span>
                    <span className="font-medium">{String(v)}</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">None extracted</p>
            )}
          </div>

          {/* Flags */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Flags / Issues
            </p>
            {order.flags.length > 0 ? (
              <ul className="space-y-1">
                {order.flags.map((flag, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-amber-700">
                    <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                    {flag}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">No flags</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              AI Notes
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {order.notes ?? "—"}
            </p>
          </div>
        </div>
      </td>
    </tr>
  );
}

export function OrdersTable() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/orders?${params}`);
      const data = await res.json();
      setOrders(data.data ?? []);
      setTotal(data.meta?.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-4">
      {/* Filters + refresh */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-1 rounded-lg border bg-muted/50 p-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => { setStatusFilter(f.value); setPage(1); }}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                statusFilter === f.value
                  ? "bg-background shadow text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{total} order{total !== 1 ? "s" : ""}</span>
          <Button variant="ghost" size="icon" onClick={fetchOrders} className="h-7 w-7">
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-8" />
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Date
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Customer Input
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Matched SKU
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Confidence
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-muted-foreground text-sm">
                    No orders yet.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <>
                    <tr
                      key={order.id}
                      className={cn(
                        "border-b cursor-pointer hover:bg-muted/30 transition-colors",
                        expandedId === order.id && "bg-muted/20"
                      )}
                      onClick={() => toggleExpand(order.id)}
                    >
                      {/* Expand toggle */}
                      <td className="px-4 py-3 text-muted-foreground">
                        {expandedId === order.id ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )}
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        <div>{new Date(order.createdAt).toLocaleDateString()}</div>
                        <div className="opacity-70">{new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                      </td>

                      {/* Raw input */}
                      <td className="px-4 py-3 max-w-xs">
                        <p className="text-sm line-clamp-2 text-foreground">
                          {order.rawInput}
                        </p>
                        {order.flags.length > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-600 mt-1">
                            <AlertTriangle className="h-3 w-3" />
                            {order.flags.length} flag{order.flags.length > 1 ? "s" : ""}
                          </span>
                        )}
                      </td>

                      {/* Matched SKU */}
                      <td className="px-4 py-3">
                        {order.matchedSku ? (
                          <div className="flex items-center gap-2">
                            {order.matchedSku.thumbnail ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={order.matchedSku.thumbnail}
                                alt={order.matchedSku.name}
                                className="h-8 w-8 rounded object-cover shrink-0"
                              />
                            ) : (
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-muted">
                                <Package className="h-3.5 w-3.5 text-muted-foreground" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-mono text-muted-foreground">{order.matchedSku.sku}</p>
                              <p className="text-xs font-medium truncate max-w-[12rem]">{order.matchedSku.name}</p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <StatusBadge status={order.status} />
                      </td>

                      {/* Confidence */}
                      <td className="px-4 py-3">
                        {order.confidence !== null ? (
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full",
                                  order.confidence >= 0.75
                                    ? "bg-emerald-500"
                                    : order.confidence >= 0.4
                                    ? "bg-amber-500"
                                    : "bg-red-500"
                                )}
                                style={{ width: `${Math.round(order.confidence * 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {Math.round(order.confidence * 100)}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>

                    {expandedId === order.id && <ExpandedRow key={`${order.id}-exp`} order={order} />}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground text-xs">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p - 1)}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
