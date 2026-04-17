import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DeleteSKUButton } from "@/components/skus/delete-sku-button";
import { SKUImageGallery } from "@/components/skus/sku-image-gallery";
import {
  formatCurrency,
  formatStatus,
  getStatusColor,
  formatMountingType,
} from "@/lib/utils";
import { Pencil, CheckCircle2, Tag } from "lucide-react";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const sku = await prisma.sKU.findUnique({ where: { id } });
  return { title: sku?.name ?? "SKU Detail" };
}

export default async function SKUDetailPage({ params }: Props) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { id } = await params;

  const sku = await prisma.sKU.findUnique({
    where: { id },
    include: {
      category: true,
      images: { orderBy: { order: "asc" } },
    },
  });

  if (!sku) notFound();


  return (
    <>
      <Header
        title={sku.name}
        description={`SKU: ${sku.sku}`}
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/skus">← Back</Link>
            </Button>
            <DeleteSKUButton id={sku.id} name={sku.name} />
            <Button asChild size="sm">
              <Link href={`/skus/${sku.id}/edit`}>
                <Pencil className="h-4 w-4" /> Edit SKU
              </Link>
            </Button>
          </div>
        }
      />

      <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6 animate-fade-in">
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Images */}
          <div className="lg:col-span-2">
            <SKUImageGallery
              images={sku.images.map((img) => ({
                id: img.id,
                url: img.url,
                alt: img.alt,
                isPrimary: img.isPrimary,
              }))}
              skuName={sku.name}
            />
          </div>

          {/* Details */}
          <div className="lg:col-span-3 space-y-4">
            {/* Header info */}
            <Card>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold">{sku.name}</h2>
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                        {sku.sku}
                      </code>
                      <Badge variant="secondary">{sku.category.name}</Badge>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusColor(sku.status)}`}
                  >
                    {formatStatus(sku.status)}
                  </span>
                </div>

                {sku.shortDescription && (
                  <p className="text-sm text-muted-foreground">{sku.shortDescription}</p>
                )}

                <Separator />

                {/* Pricing */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Retail Price</p>
                    <p className="text-xl font-bold">{formatCurrency(sku.retailPrice)}</p>
                  </div>
                  {sku.wholesalePrice && (
                    <div>
                      <p className="text-xs text-muted-foreground">Wholesale</p>
                      <p className="text-lg font-semibold">{formatCurrency(sku.wholesalePrice)}</p>
                    </div>
                  )}
                  {sku.msrp && (
                    <div>
                      <p className="text-xs text-muted-foreground">MSRP</p>
                      <p className="text-lg font-semibold">{formatCurrency(sku.msrp)}</p>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Stock Quantity</p>
                    <p
                      className={`text-2xl font-bold ${
                        sku.stockQuantity === 0
                          ? "text-destructive"
                          : sku.stockQuantity < 10
                          ? "text-amber-600"
                          : ""
                      }`}
                    >
                      {sku.stockQuantity}
                    </p>
                  </div>
                  {sku.postalApproved && (
                    <div className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span className="text-xs font-medium text-emerald-700">USPS Approved</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Specs */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Specifications</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: "Color", value: sku.color },
                  { label: "Material", value: sku.material },
                  { label: "Finish", value: sku.finish },
                  { label: "Mounting", value: formatMountingType(sku.mountingType) },
                  { label: "No. of Doors", value: sku.numberOfDoors },
                  { label: "Lock Type", value: sku.lockType },
                  {
                    label: "Dimensions (W×H×D)",
                    value:
                      sku.width || sku.height || sku.depth
                        ? `${sku.width ?? "?"}" × ${sku.height ?? "?"}" × ${sku.depth ?? "?"}"`
                        : null,
                  },
                  {
                    label: "Weight",
                    value: sku.weight ? `${sku.weight} lbs` : null,
                  },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="font-medium">{value ?? "—"}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Description */}
        {sku.description && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{sku.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Features & Tags */}
        {(sku.features.length > 0 || sku.tags.length > 0) && (
          <div className="grid gap-4 sm:grid-cols-2">
            {sku.features.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Features</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5">
                    {sku.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {sku.tags.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Tags</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {sku.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="flex items-center gap-1 rounded-full border bg-secondary px-2.5 py-1 text-xs font-medium"
                      >
                        <Tag className="h-3 w-3" />#{tag}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Metadata */}
        <Card>
          <CardContent className="grid grid-cols-2 gap-4 p-5 text-xs text-muted-foreground sm:grid-cols-4">
            <div>
              <p>Created</p>
              <p className="mt-0.5 font-medium text-foreground">
                {new Date(sku.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
            <div>
              <p>Last Updated</p>
              <p className="mt-0.5 font-medium text-foreground">
                {new Date(sku.updatedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
            <div>
              <p>Images</p>
              <p className="mt-0.5 font-medium text-foreground">{sku.images.length}</p>
            </div>
            <div>
              <p>ID</p>
              <code className="mt-0.5 block font-mono text-foreground break-all">
                {sku.id}
              </code>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
