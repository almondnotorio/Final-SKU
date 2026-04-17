"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Copy,
  Package,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatStatus, getStatusColor } from "@/lib/utils";
import type { SKUListItem } from "@/types";

interface SKUTableProps {
  skus: SKUListItem[];
  loading?: boolean;
  sortBy: string;
  sortOrder: "asc" | "desc";
  onSort: (field: string) => void;
}

function SortIcon({
  field,
  sortBy,
  sortOrder,
}: {
  field: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
}) {
  if (sortBy !== field) return <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />;
  return sortOrder === "asc" ? (
    <ArrowUp className="h-3.5 w-3.5 text-primary" />
  ) : (
    <ArrowDown className="h-3.5 w-3.5 text-primary" />
  );
}

export function SKUTable({
  skus,
  loading,
  sortBy,
  sortOrder,
  onSort,
}: SKUTableProps) {
  const router = useRouter();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/skus/${deleteId}`, { method: "DELETE" });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      toast.success("SKU deleted");
      setDeleteId(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const handleCopySku = (sku: string) => {
    navigator.clipboard.writeText(sku);
    toast.success("SKU code copied");
  };

  const columns = [
    { key: "name", label: "Product" },
    { key: "sku", label: "SKU Code" },
    { key: "retailPrice", label: "Retail Price" },
    { key: "stockQuantity", label: "Stock" },
    { key: "status", label: "Status" },
    { key: "updatedAt", label: "Updated" },
  ];

  return (
    <>
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium text-muted-foreground"
                  >
                    <button
                      className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                      onClick={() => onSort(col.key)}
                    >
                      {col.label}
                      <SortIcon field={col.key} sortBy={sortBy} sortOrder={sortOrder} />
                    </button>
                  </th>
                ))}
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <Skeleton className="h-4 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                : skus.length === 0
                ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-3 text-muted-foreground">
                          <Package className="h-10 w-10 opacity-30" />
                          <div>
                            <p className="font-medium">No SKUs found</p>
                            <p className="text-xs">Try adjusting your filters</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                : skus.map((sku) => (
                    <tr
                      key={sku.id}
                      className="group hover:bg-muted/20 transition-colors"
                    >
                      {/* Product */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border bg-muted">
                            {sku.thumbnail ? (
                              <Image
                                src={sku.thumbnail}
                                alt={sku.name}
                                fill
                                className="object-cover"
                                sizes="40px"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center">
                                <Package className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div>
                            <Link
                              href={`/skus/${sku.id}`}
                              className="font-medium hover:text-primary transition-colors line-clamp-1"
                            >
                              {sku.name}
                            </Link>
                            <p className="text-xs text-muted-foreground">
                              {sku.category.name}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* SKU Code */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                            {sku.sku}
                          </code>
                          <button
                            onClick={() => handleCopySku(sku.sku)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Copy SKU"
                          >
                            <Copy className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                          </button>
                        </div>
                      </td>

                      {/* Price */}
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{formatCurrency(sku.retailPrice)}</p>
                          {sku.wholesalePrice && (
                            <p className="text-xs text-muted-foreground">
                              WS: {formatCurrency(sku.wholesalePrice)}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Stock */}
                      <td className="px-4 py-3">
                        <span
                          className={
                            sku.stockQuantity === 0
                              ? "text-destructive font-medium"
                              : sku.stockQuantity < 10
                              ? "text-amber-600 font-medium"
                              : ""
                          }
                        >
                          {sku.stockQuantity}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        {(() => {
                          const displayStatus = sku.stockQuantity === 0 ? "OUT_OF_STOCK" : sku.status;
                          return (
                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${getStatusColor(displayStatus)}`}
                            >
                              {formatStatus(displayStatus)}
                            </span>
                          );
                        })()}
                      </td>

                      {/* Updated */}
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(sku.updatedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuLabel className="text-xs">Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                              <Link href={`/skus/${sku.id}`}>
                                <Eye className="h-3.5 w-3.5" />
                                View
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/skus/${sku.id}/edit`}>
                                <Pencil className="h-3.5 w-3.5" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteId(sku.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete SKU</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the SKU
              and all associated data including images.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete SKU"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
