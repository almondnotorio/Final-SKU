"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Package, AlertTriangle, CheckCircle2, XCircle, HelpCircle } from "lucide-react";
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

interface ProcessedOrder {
  id: string;
  rawInput: string;
  parsedData: Record<string, unknown>;
  matchedSkuId: string | null;
  matchedSku: MatchedSku | null;
  confidence: number | null;
  status: OrderStatus;
  flags: string[];
  notes: string | null;
  createdAt: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  order?: ProcessedOrder;
  parsedAttributes?: Record<string, unknown>;
}

const STATUS_CONFIG: Record<OrderStatus, { label: string; icon: React.ElementType; className: string }> = {
  MATCHED: { label: "Matched", icon: CheckCircle2, className: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  PARTIAL_MATCH: { label: "Partial Match", icon: HelpCircle, className: "text-amber-600 bg-amber-50 border-amber-200" },
  NO_MATCH: { label: "No Match", icon: XCircle, className: "text-red-600 bg-red-50 border-red-200" },
  INVALID: { label: "Invalid Order", icon: AlertTriangle, className: "text-red-700 bg-red-50 border-red-200" },
  PENDING: { label: "Pending", icon: Loader2, className: "text-gray-600 bg-gray-50 border-gray-200" },
};

function OrderResultCard({ order, parsedAttributes }: { order: ProcessedOrder; parsedAttributes?: Record<string, unknown> }) {
  const cfg = STATUS_CONFIG[order.status];
  const Icon = cfg.icon;
  const attrs = parsedAttributes ?? (order.parsedData as Record<string, unknown>) ?? {};

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm mt-2 overflow-hidden">
      {/* Status header */}
      <div className={cn("flex items-center gap-2 px-4 py-2.5 border-b text-sm font-medium", cfg.className)}>
        <Icon className="h-4 w-4 shrink-0" />
        <span>{cfg.label}</span>
        {order.confidence !== null && (
          <span className="ml-auto text-xs opacity-70">
            {Math.round((order.confidence ?? 0) * 100)}% confidence
          </span>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Matched SKU */}
        {order.matchedSku && (
          <div className="flex items-start gap-3 rounded-md border bg-muted/40 p-3">
            {order.matchedSku.thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={order.matchedSku.thumbnail}
                alt={order.matchedSku.name}
                className="h-12 w-12 rounded object-cover shrink-0"
              />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-muted">
                <Package className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                {order.matchedSku.category.name}
              </p>
              <p className="font-semibold text-sm leading-tight">{order.matchedSku.name}</p>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">{order.matchedSku.sku}</p>
              <p className="text-sm font-medium text-primary mt-1">
                ${Number(order.matchedSku.retailPrice).toFixed(2)}
              </p>
            </div>
          </div>
        )}

        {/* Parsed attributes */}
        {Object.keys(attrs).length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Extracted Attributes
            </p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(attrs).map(([k, v]) => (
                <span
                  key={k}
                  className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs"
                >
                  <span className="text-muted-foreground capitalize">{k.replace(/_/g, " ")}:</span>
                  <span className="font-medium">{String(v)}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Flags */}
        {order.flags.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Flags &amp; Issues
            </p>
            <ul className="space-y-1">
              {order.flags.map((flag, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-amber-700">
                  <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                  {flag}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* AI notes */}
        {order.notes && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              Notes
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">{order.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

const EXAMPLE_ORDERS = [
  "We need 6x18 signage, .040 thickness, HIP reflectivity, double sided, rush delivery",
  "4 residential mailboxes, bronze finish, wall mount, with lock",
  "Community cluster mailbox, 16 doors, pedestal mount, postal approved",
];

export function OrderChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hi! I can process your orders using natural language. Just describe what you need and I'll match it to our SKU catalog.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(text?: string) {
    const order = (text ?? input).trim();
    if (!order || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: order }]);
    setLoading(true);

    try {
      const res = await fetch("/api/orders/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawInput: order }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.error ?? "Something went wrong. Please try again." },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "",
          order: data.data.order,
          parsedAttributes: data.data.parsedAttributes,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Network error. Please check your connection and try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-muted text-foreground rounded-bl-sm"
              )}
            >
              {msg.content && <p>{msg.content}</p>}
              {msg.order && (
                <OrderResultCard order={msg.order} parsedAttributes={msg.parsedAttributes} />
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Processing order...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Example prompts — only show before first user message */}
      {messages.filter((m) => m.role === "user").length === 0 && (
        <div className="px-4 pb-2">
          <p className="text-xs text-muted-foreground mb-2">Try an example:</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_ORDERS.map((ex) => (
              <button
                key={ex}
                onClick={() => handleSubmit(ex)}
                className="text-xs rounded-full border border-dashed px-3 py-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              >
                {ex.length > 55 ? ex.slice(0, 55) + "…" : ex}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t bg-background px-4 py-3">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
          className="flex gap-2 items-end"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Describe your order in plain language… (Enter to send, Shift+Enter for new line)"
            rows={2}
            className="flex-1 resize-none rounded-xl border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button type="submit" size="icon" disabled={loading || !input.trim()} className="shrink-0 rounded-xl h-10 w-10">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}
