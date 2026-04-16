"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { SKUTable } from "@/components/skus/sku-table";
import { SKUCard } from "@/components/skus/sku-card";
import { SKUFilters } from "@/components/skus/sku-filters";
import { SKUPagination } from "@/components/skus/sku-pagination";
import type { Category } from "@prisma/client";
import type { SKUListItem, ViewMode } from "@/types";

export default function SKUsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [skus, setSkus] = useState<SKUListItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const sortBy = searchParams.get("sortBy") ?? "createdAt";
  const sortOrder = (searchParams.get("sortOrder") ?? "desc") as "asc" | "desc";

  const handleSort = (field: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (sortBy === field) {
      params.set("sortOrder", sortOrder === "asc" ? "desc" : "asc");
    } else {
      params.set("sortBy", field);
      params.set("sortOrder", "desc");
    }
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const fetchSKUs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/skus?${searchParams.toString()}`);
      const data = await res.json();
      if (data.success) {
        setSkus(data.data);
        setMeta(data.meta);
      }
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  const fetchCategories = useCallback(async () => {
    const res = await fetch("/api/categories");
    const data = await res.json();
    if (data.success) setCategories(data.data);
  }, []);

  useEffect(() => {
    fetchSKUs();
  }, [fetchSKUs]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return (
    <>
      <Header
        title="SKU Catalog"
        description="Manage all your signage products"
        actions={
          <Button asChild size="sm">
            <Link href="/skus/new">
              <Plus className="h-4 w-4" /> New SKU
            </Link>
          </Button>
        }
      />
      <div className="space-y-4 p-6">
        <SKUFilters
          categories={categories}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          totalCount={meta.total}
        />

        {viewMode === "list" ? (
          <SKUTable
            skus={skus}
            loading={loading}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
          />
        ) : (
          <div>
            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-72 animate-pulse rounded-xl border bg-muted" />
                ))}
              </div>
            ) : skus.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-xl border bg-card py-20 text-muted-foreground">
                <p className="font-medium">No SKUs found</p>
                <p className="text-sm">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                {skus.map((sku) => (
                  <SKUCard key={sku.id} sku={sku} />
                ))}
              </div>
            )}
          </div>
        )}

        <SKUPagination
          page={meta.page}
          totalPages={meta.totalPages}
          total={meta.total}
          limit={meta.limit}
        />
      </div>
    </>
  );
}
