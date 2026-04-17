import { Suspense } from "react";
import Link from "next/link";
import { Package, CheckCircle2, AlertTriangle, XCircle, Tag, Plus, ArrowRight } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatStatus, getStatusColor } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard" };

async function DashboardStats() {
  const [totalSKUs, activeSKUs, outOfStock, discontinued, totalCategories, recentSKUs] =
    await Promise.all([
      prisma.sKU.count(),
      prisma.sKU.count({ where: { status: "ACTIVE", stockQuantity: { gt: 0 } } }),
      prisma.sKU.count({ where: { OR: [{ status: "OUT_OF_STOCK" }, { stockQuantity: 0 }] } }),
      prisma.sKU.count({ where: { status: "DISCONTINUED" } }),
      prisma.category.count(),
      prisma.sKU.findMany({
        take: 6,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          sku: true,
          name: true,
          retailPrice: true,
          status: true,
          stockQuantity: true,
          thumbnail: true,
          createdAt: true,
          category: { select: { name: true } },
        },
      }),
    ]);

  const stats = [
    {
      label: "Total SKUs",
      value: totalSKUs,
      icon: Package,
      color: "text-[#C24B2F]",
      bg: "bg-[#C24B2F]/10",
      href: "/skus",
    },
    {
      label: "Active SKUs",
      value: activeSKUs,
      icon: CheckCircle2,
      color: "text-emerald-700",
      bg: "bg-emerald-50",
      href: "/skus?status=ACTIVE",
    },
    {
      label: "Out of Stock",
      value: outOfStock,
      icon: AlertTriangle,
      color: "text-amber-700",
      bg: "bg-amber-50",
      href: "/skus?status=OUT_OF_STOCK",
    },
    {
      label: "Discontinued",
      value: discontinued,
      icon: XCircle,
      color: "text-red-700",
      bg: "bg-red-50",
      href: "/skus?status=DISCONTINUED",
    },
    {
      label: "Categories",
      value: totalCategories,
      icon: Tag,
      color: "text-stone-700",
      bg: "bg-stone-100",
      href: "/categories",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="transition-all hover:shadow-md cursor-pointer border-border/60 bg-card">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium tracking-widest uppercase text-muted-foreground">
                      {stat.label}
                    </p>
                    <p className="mt-1.5 font-playfair text-3xl font-bold text-foreground">
                      {stat.value}
                    </p>
                  </div>
                  <div className={`rounded-md ${stat.bg} p-3`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent SKUs */}
      <Card className="border-border/60">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="font-playfair text-base font-semibold">
            Recently Added SKUs
          </CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href="/skus">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {recentSKUs.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
              <Package className="h-10 w-10 opacity-20" />
              <div className="text-center">
                <p className="font-medium">No SKUs yet</p>
                <p className="text-sm">Create your first signage SKU to get started</p>
              </div>
              <Button asChild size="sm">
                <Link href="/skus/new">
                  <Plus className="h-4 w-4" /> Add SKU
                </Link>
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {recentSKUs.map((sku) => (
                <Link
                  key={sku.id}
                  href={`/skus/${sku.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors md:px-6"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-secondary">
                      <Package className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{sku.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {sku.sku} · {sku.category.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 md:gap-4">
                    <span className="hidden text-sm font-medium sm:inline">{formatCurrency(sku.retailPrice)}</span>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${getStatusColor(sku.stockQuantity === 0 ? "OUT_OF_STOCK" : sku.status)}`}
                    >
                      {formatStatus(sku.stockQuantity === 0 ? "OUT_OF_STOCK" : sku.status)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <>
      <Header
        title="Dashboard"
        description="Overview of your signages catalog"
        actions={
          <Button asChild size="sm">
            <Link href="/skus/new">
              <Plus className="h-4 w-4" /> New SKU
            </Link>
          </Button>
        }
      />
      <div className="p-4 md:p-6">
        <Suspense fallback={<StatsSkeleton />}>
          <DashboardStats />
        </Suspense>
      </div>
    </>
  );
}
