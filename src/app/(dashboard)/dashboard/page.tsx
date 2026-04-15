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
      prisma.sKU.count({ where: { status: "ACTIVE" } }),
      prisma.sKU.count({ where: { status: "OUT_OF_STOCK" } }),
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
      color: "text-blue-600",
      bg: "bg-blue-50",
      href: "/skus",
    },
    {
      label: "Active SKUs",
      value: activeSKUs,
      icon: CheckCircle2,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      href: "/skus?status=ACTIVE",
    },
    {
      label: "Out of Stock",
      value: outOfStock,
      icon: AlertTriangle,
      color: "text-amber-600",
      bg: "bg-amber-50",
      href: "/skus?status=OUT_OF_STOCK",
    },
    {
      label: "Discontinued",
      value: discontinued,
      icon: XCircle,
      color: "text-red-600",
      bg: "bg-red-50",
      href: "/skus?status=DISCONTINUED",
    },
    {
      label: "Categories",
      value: totalCategories,
      icon: Tag,
      color: "text-purple-600",
      bg: "bg-purple-50",
      href: "/categories",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="transition-shadow hover:shadow-md cursor-pointer">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                    <p className="mt-1 text-3xl font-bold">{stat.value}</p>
                  </div>
                  <div className={`rounded-xl ${stat.bg} p-3`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent SKUs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-base">Recently Added SKUs</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href="/skus">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {recentSKUs.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
              <Package className="h-10 w-10 opacity-30" />
              <div className="text-center">
                <p className="font-medium">No SKUs yet</p>
                <p className="text-sm">Create your first mailbox SKU to get started</p>
              </div>
              <Button asChild size="sm">
                <Link href="/skus/new">
                  <Plus className="h-4 w-4" /> Add SKU
                </Link>
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {recentSKUs.map((sku) => (
                <Link
                  key={sku.id}
                  href={`/skus/${sku.id}`}
                  className="flex items-center justify-between px-6 py-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border bg-muted">
                      <Package className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{sku.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {sku.sku} · {sku.category.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium">{formatCurrency(sku.retailPrice)}</span>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${getStatusColor(sku.status)}`}
                    >
                      {formatStatus(sku.status)}
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
        description="Overview of your mailbox SKU catalog"
        actions={
          <Button asChild size="sm">
            <Link href="/skus/new">
              <Plus className="h-4 w-4" /> New SKU
            </Link>
          </Button>
        }
      />
      <div className="p-6">
        <Suspense fallback={<StatsSkeleton />}>
          <DashboardStats />
        </Suspense>
      </div>
    </>
  );
}
