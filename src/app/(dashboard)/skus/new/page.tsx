import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { SKUForm } from "@/components/skus/sku-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "New SKU" };

export default async function NewSKUPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <>
      <Header
        title="Create New SKU"
        description="Add a new signage product to your catalog"
      />
      <div className="mx-auto max-w-4xl p-4 md:p-6">
        {categories.length === 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
            <p className="font-medium text-amber-800">No categories found</p>
            <p className="mt-1 text-sm text-amber-700">
              You need to create at least one category before adding SKUs.
            </p>
            <a
              href="/categories"
              className="mt-3 inline-block text-sm font-medium text-amber-800 underline"
            >
              Go to Categories →
            </a>
          </div>
        ) : (
          <SKUForm categories={categories} mode="create" />
        )}
      </div>
    </>
  );
}
