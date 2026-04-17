import { OrdersTable } from "@/components/orders/orders-table";
import { ClipboardList } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Order Management" };

export default function OrdersAdminPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <ClipboardList className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight">Order Management</h1>
            <p className="text-xs text-muted-foreground">
              All AI-processed orders — parsed attributes, matched SKUs, and flags
            </p>
          </div>
        </div>
        <Button size="sm" asChild>
          <Link href="/orders">+ New Order</Link>
        </Button>
      </div>

      <OrdersTable />
    </div>
  );
}
