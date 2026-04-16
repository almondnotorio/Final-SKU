import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { SKUForm } from "@/components/skus/sku-form";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const sku = await prisma.sKU.findUnique({ where: { id } });
  return { title: sku ? `Edit: ${sku.name}` : "Edit SKU" };
}

export default async function EditSKUPage({ params }: Props) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { id } = await params;

  const [sku, categories] = await Promise.all([
    prisma.sKU.findUnique({
      where: { id },
      include: {
        category: true,
        images: { orderBy: { order: "asc" } },
      },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!sku) notFound();

  return (
    <>
      <Header
        title={`Edit: ${sku.name}`}
        description={`SKU Code: ${sku.sku}`}
      />
      <div className="mx-auto max-w-4xl p-4 md:p-6">
        <SKUForm categories={categories} initialData={sku} mode="edit" />
      </div>
    </>
  );
}
