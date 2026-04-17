import { OrderChat } from "@/components/orders/order-chat";
import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Order Processing" };

export default function OrdersPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <ShoppingCart className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight">Order Processing</h1>
            <p className="text-xs text-muted-foreground">
              Describe your order in natural language — AI will match it to a SKU
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/orders/admin">View All Orders</Link>
        </Button>
      </div>

      {/* Chat */}
      <div className="flex-1 overflow-hidden">
        <OrderChat />
      </div>
    </div>
  );
}
