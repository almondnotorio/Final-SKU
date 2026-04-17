"use client";

import Link from "next/link";
import Image from "next/image";
import { Package, Pencil, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, getStatusColor, formatStatus } from "@/lib/utils";
import type { SKUListItem } from "@/types";

interface SKUCardProps {
  sku: SKUListItem;
}

export function SKUCard({ sku }: SKUCardProps) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md">
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {sku.thumbnail ? (
          <Image
            src={sku.thumbnail}
            alt={sku.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Package className="h-12 w-12 text-muted-foreground/30" />
          </div>
        )}
        {/* Status overlay */}
        <div className="absolute left-2 top-2">
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
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        <p className="mb-0.5 text-xs text-muted-foreground">{sku.category.name}</p>
        <h3 className="mb-1 font-medium leading-tight line-clamp-2">{sku.name}</h3>
        <code className="mb-3 text-xs font-mono text-muted-foreground">{sku.sku}</code>

        <div className="mt-auto space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-lg font-semibold">{formatCurrency(sku.retailPrice)}</p>
              {sku.wholesalePrice && (
                <p className="text-xs text-muted-foreground">
                  WS: {formatCurrency(sku.wholesalePrice)}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Stock</p>
              <p
                className={`text-sm font-medium ${
                  sku.stockQuantity === 0
                    ? "text-destructive"
                    : sku.stockQuantity < 10
                    ? "text-amber-600"
                    : "text-foreground"
                }`}
              >
                {sku.stockQuantity}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm" className="flex-1">
              <Link href={`/skus/${sku.id}`}>
                <Eye className="h-3.5 w-3.5" />
                View
              </Link>
            </Button>
            <Button asChild size="sm" className="flex-1">
              <Link href={`/skus/${sku.id}/edit`}>
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
