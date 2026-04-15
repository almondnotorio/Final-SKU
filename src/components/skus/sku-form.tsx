"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Wand2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ImageUpload } from "./image-upload";
import { createSKUSchema, type CreateSKUInput } from "@/lib/validations";
import { generateSKUCode } from "@/lib/utils";
import type { Category } from "@prisma/client";
import type { SKUWithRelations } from "@/types";

interface SKUFormProps {
  categories: Category[];
  initialData?: SKUWithRelations;
  mode: "create" | "edit";
}

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "DISCONTINUED", label: "Discontinued" },
  { value: "OUT_OF_STOCK", label: "Out of Stock" },
];

const MOUNTING_TYPE_OPTIONS = [
  { value: "POST", label: "Post Mounted" },
  { value: "WALL", label: "Wall Mounted" },
  { value: "PEDESTAL", label: "Pedestal" },
  { value: "IN_GROUND", label: "In-Ground" },
  { value: "SURFACE", label: "Surface Mounted" },
  { value: "RECESSED", label: "Recessed" },
];

export function SKUForm({ categories, initialData, mode }: SKUFormProps) {
  const router = useRouter();
  const [images, setImages] = useState<
    Array<{ id?: string; url: string; alt?: string; isPrimary?: boolean; order?: number }>
  >(
    (initialData?.images ?? []).map((img) => ({
      id: img.id,
      url: img.url,
      alt: img.alt ?? undefined,
      isPrimary: img.isPrimary,
      order: img.order,
    }))
  );
  const [featureInput, setFeatureInput] = useState("");
  const [tagInput, setTagInput] = useState("");

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateSKUInput>({
    resolver: zodResolver(createSKUSchema),
    defaultValues: {
      sku: initialData?.sku ?? "",
      name: initialData?.name ?? "",
      description: initialData?.description ?? "",
      shortDescription: initialData?.shortDescription ?? "",
      categoryId: initialData?.categoryId ?? "",
      retailPrice: initialData?.retailPrice
        ? Number(initialData.retailPrice)
        : undefined,
      wholesalePrice: initialData?.wholesalePrice
        ? Number(initialData.wholesalePrice)
        : undefined,
      msrp: initialData?.msrp ? Number(initialData.msrp) : undefined,
      status: (initialData?.status as CreateSKUInput["status"]) ?? "ACTIVE",
      stockQuantity: initialData?.stockQuantity ?? 0,
      width: initialData?.width ? Number(initialData.width) : undefined,
      height: initialData?.height ? Number(initialData.height) : undefined,
      depth: initialData?.depth ? Number(initialData.depth) : undefined,
      weight: initialData?.weight ? Number(initialData.weight) : undefined,
      color: initialData?.color ?? "",
      material: initialData?.material ?? "",
      finish: initialData?.finish ?? "",
      mountingType: (initialData?.mountingType as CreateSKUInput["mountingType"]) ?? undefined,
      numberOfDoors: initialData?.numberOfDoors ?? undefined,
      lockType: initialData?.lockType ?? "",
      postalApproved: initialData?.postalApproved ?? false,
      features: initialData?.features ?? [],
      tags: initialData?.tags ?? [],
    },
  });

  // eslint-disable-next-line react-hooks/incompatible-library -- react-hook-form watch() is designed for component-level reactive reads
  const features = watch("features") ?? [];
  const tags = watch("tags") ?? [];
  const watchedName = watch("name");
  const watchedCategoryId = watch("categoryId");

  const handleGenerateSKU = () => {
    const cat = categories.find((c) => c.id === watchedCategoryId);
    const code = generateSKUCode(watchedName || "ITEM", cat?.name || "GEN");
    setValue("sku", code, { shouldValidate: true });
  };

  const addFeature = () => {
    const trimmed = featureInput.trim();
    if (!trimmed || features.includes(trimmed)) return;
    setValue("features", [...features, trimmed], { shouldValidate: true });
    setFeatureInput("");
  };

  const removeFeature = (i: number) => {
    setValue(
      "features",
      features.filter((_, idx) => idx !== i),
      { shouldValidate: true }
    );
  };

  const addTag = () => {
    const trimmed = tagInput.trim().toLowerCase().replace(/\s+/g, "-");
    if (!trimmed || tags.includes(trimmed)) return;
    setValue("tags", [...tags, trimmed], { shouldValidate: true });
    setTagInput("");
  };

  const removeTag = (i: number) => {
    setValue(
      "tags",
      tags.filter((_, idx) => idx !== i),
      { shouldValidate: true }
    );
  };

  const onSubmit = async (data: CreateSKUInput) => {
    try {
      const thumbnail = images.find((img) => img.isPrimary)?.url ?? images[0]?.url ?? null;
      const payload = {
        ...data,
        thumbnail,
        images: images.map((img, i) => ({ ...img, order: i })),
      };

      const url = mode === "create" ? "/api/skus" : `/api/skus/${initialData!.id}`;
      const method = mode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!result.success) {
        toast.error(result.error ?? "Something went wrong");
        return;
      }

      toast.success(mode === "create" ? "SKU created!" : "SKU updated!");
      router.push(`/skus/${result.data.id}`);
      router.refresh();
    } catch {
      toast.error("An unexpected error occurred");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 animate-fade-in">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="SKU Code"
            htmlFor="sku"
            error={errors.sku?.message}
            required
          >
            <div className="flex gap-2">
              <Input
                id="sku"
                placeholder="e.g. MBX-RESI-1234"
                {...register("sku")}
                error={errors.sku?.message}
                className="font-mono uppercase"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleGenerateSKU}
                title="Auto-generate SKU"
              >
                <Wand2 className="h-4 w-4" />
              </Button>
            </div>
          </FormField>

          <FormField
            label="Product Name"
            htmlFor="name"
            error={errors.name?.message}
            required
          >
            <Input
              id="name"
              placeholder="e.g. Classic Residential Mailbox"
              {...register("name")}
              error={errors.name?.message}
            />
          </FormField>

          <FormField
            label="Category"
            htmlFor="categoryId"
            error={errors.categoryId?.message}
            required
          >
            <Controller
              name="categoryId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger error={errors.categoryId?.message}>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          <FormField
            label="Status"
            htmlFor="status"
            error={errors.status?.message}
            required
          >
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          <div className="sm:col-span-2">
            <FormField
              label="Short Description"
              htmlFor="shortDescription"
              error={errors.shortDescription?.message}
              hint="Displayed in product listings (max 500 chars)"
            >
              <Textarea
                id="shortDescription"
                placeholder="Brief product summary..."
                rows={2}
                {...register("shortDescription")}
                error={errors.shortDescription?.message}
              />
            </FormField>
          </div>

          <div className="sm:col-span-2">
            <FormField
              label="Full Description"
              htmlFor="description"
              error={errors.description?.message}
            >
              <Textarea
                id="description"
                placeholder="Detailed product description..."
                rows={5}
                {...register("description")}
                error={errors.description?.message}
              />
            </FormField>
          </div>
        </CardContent>
      </Card>

      {/* Pricing & Inventory */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pricing & Inventory</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <FormField
            label="Retail Price"
            htmlFor="retailPrice"
            error={errors.retailPrice?.message}
            required
          >
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <Input
                id="retailPrice"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                className="pl-7"
                {...register("retailPrice", { valueAsNumber: true })}
                error={errors.retailPrice?.message}
              />
            </div>
          </FormField>

          <FormField
            label="Wholesale Price"
            htmlFor="wholesalePrice"
            error={errors.wholesalePrice?.message}
          >
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <Input
                id="wholesalePrice"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                className="pl-7"
                {...register("wholesalePrice", { valueAsNumber: true })}
                error={errors.wholesalePrice?.message}
              />
            </div>
          </FormField>

          <FormField
            label="MSRP"
            htmlFor="msrp"
            error={errors.msrp?.message}
          >
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <Input
                id="msrp"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                className="pl-7"
                {...register("msrp", { valueAsNumber: true })}
                error={errors.msrp?.message}
              />
            </div>
          </FormField>

          <FormField
            label="Stock Quantity"
            htmlFor="stockQuantity"
            error={errors.stockQuantity?.message}
          >
            <Input
              id="stockQuantity"
              type="number"
              min="0"
              step="1"
              placeholder="0"
              {...register("stockQuantity", { valueAsNumber: true })}
              error={errors.stockQuantity?.message}
            />
          </FormField>
        </CardContent>
      </Card>

      {/* Physical Specifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Physical Specifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-4">
            {(["width", "height", "depth"] as const).map((dim) => (
              <FormField
                key={dim}
                label={`${dim.charAt(0).toUpperCase() + dim.slice(1)} (in)`}
                htmlFor={dim}
                error={errors[dim]?.message}
              >
                <Input
                  id={dim}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  {...register(dim, { valueAsNumber: true })}
                  error={errors[dim]?.message}
                />
              </FormField>
            ))}
            <FormField
              label="Weight (lbs)"
              htmlFor="weight"
              error={errors.weight?.message}
            >
              <Input
                id="weight"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...register("weight", { valueAsNumber: true })}
                error={errors.weight?.message}
              />
            </FormField>
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Color" htmlFor="color" error={errors.color?.message}>
              <Input id="color" placeholder="e.g. Black, Bronze" {...register("color")} />
            </FormField>

            <FormField label="Material" htmlFor="material" error={errors.material?.message}>
              <Input id="material" placeholder="e.g. Galvanized Steel" {...register("material")} />
            </FormField>

            <FormField label="Finish" htmlFor="finish" error={errors.finish?.message}>
              <Input id="finish" placeholder="e.g. Powder Coat" {...register("finish")} />
            </FormField>

            <FormField
              label="Mounting Type"
              htmlFor="mountingType"
              error={errors.mountingType?.message}
            >
              <Controller
                name="mountingType"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? ""}
                    onValueChange={(v) => field.onChange(v || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select mounting" />
                    </SelectTrigger>
                    <SelectContent>
                      {MOUNTING_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            <FormField
              label="Number of Doors"
              htmlFor="numberOfDoors"
              error={errors.numberOfDoors?.message}
            >
              <Input
                id="numberOfDoors"
                type="number"
                min="1"
                step="1"
                placeholder="1"
                {...register("numberOfDoors", { valueAsNumber: true })}
                error={errors.numberOfDoors?.message}
              />
            </FormField>

            <FormField
              label="Lock Type"
              htmlFor="lockType"
              error={errors.lockType?.message}
            >
              <Input
                id="lockType"
                placeholder="e.g. Cam Lock, Arrow Lock"
                {...register("lockType")}
              />
            </FormField>
          </div>

          <div className="flex items-center gap-3 rounded-lg border p-4">
            <Controller
              name="postalApproved"
              control={control}
              render={({ field }) => (
                <Switch
                  id="postalApproved"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <div>
              <Label htmlFor="postalApproved" className="cursor-pointer">
                USPS Postal Approved
              </Label>
              <p className="text-xs text-muted-foreground">
                This product meets USPS postal regulations
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features & Tags */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Features & Tags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            label="Features"
            error={errors.features?.message}
            hint="Add key product features (e.g. 'Rust-resistant coating')"
          >
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={featureInput}
                  onChange={(e) => setFeatureInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addFeature();
                    }
                  }}
                  placeholder="Add a feature..."
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={addFeature}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {features.length > 0 && (
                <ul className="space-y-1.5">
                  {features.map((f, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-1.5 text-sm"
                    >
                      <span>{f}</span>
                      <button
                        type="button"
                        onClick={() => removeFeature(i)}
                        className="ml-2 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </FormField>

          <FormField
            label="Tags"
            error={errors.tags?.message}
            hint="Add searchable tags (e.g. 'residential', 'community')"
          >
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="Add a tag..."
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={addTag}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, i) => (
                    <span
                      key={i}
                      className="flex items-center gap-1 rounded-full border bg-secondary px-2.5 py-0.5 text-xs font-medium"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => removeTag(i)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </FormField>
        </CardContent>
      </Card>

      {/* Images */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Product Images</CardTitle>
        </CardHeader>
        <CardContent>
          <ImageUpload
            value={images}
            onChange={setImages}
            disabled={isSubmitting}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 rounded-xl border bg-card p-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" />}
          {mode === "create" ? "Create SKU" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
