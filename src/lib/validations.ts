import { z } from "zod";

export const SKUStatusEnum = z.enum([
  "ACTIVE",
  "INACTIVE",
  "DISCONTINUED",
  "OUT_OF_STOCK",
]);

export const MountingTypeEnum = z.enum([
  "POST",
  "WALL",
  "PEDESTAL",
  "IN_GROUND",
  "SURFACE",
  "RECESSED",
]);

export const createSKUSchema = z.object({
  sku: z
    .string()
    .min(2, "SKU must be at least 2 characters")
    .max(50, "SKU must be 50 characters or less")
    .regex(/^[A-Z0-9_\-]+$/i, "SKU can only contain letters, numbers, hyphens, and underscores")
    .transform((v) => v.toUpperCase()),
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(200, "Name must be 200 characters or less"),
  description: z.string().max(5000, "Description must be 5000 characters or less").optional().nullable(),
  shortDescription: z
    .string()
    .max(500, "Short description must be 500 characters or less")
    .optional()
    .nullable(),
  categoryId: z.string().min(1, "Category is required"),
  retailPrice: z
    .number({ invalid_type_error: "Retail price must be a number" })
    .min(0, "Price cannot be negative")
    .max(999999.99, "Price too large"),
  wholesalePrice: z
    .number({ invalid_type_error: "Wholesale price must be a number" })
    .min(0, "Price cannot be negative")
    .max(999999.99, "Price too large")
    .optional()
    .nullable(),
  msrp: z
    .number({ invalid_type_error: "MSRP must be a number" })
    .min(0, "MSRP cannot be negative")
    .max(999999.99, "MSRP too large")
    .optional()
    .nullable(),
  thumbnail: z.string().url("Must be a valid URL").optional().nullable(),
  status: SKUStatusEnum.default("ACTIVE"),
  stockQuantity: z
    .number({ invalid_type_error: "Stock quantity must be a number" })
    .int("Stock quantity must be a whole number")
    .min(0, "Stock cannot be negative")
    .default(0),
  width: z.number().min(0).max(9999.99).optional().nullable(),
  height: z.number().min(0).max(9999.99).optional().nullable(),
  depth: z.number().min(0).max(9999.99).optional().nullable(),
  weight: z.number().min(0).max(9999.99).optional().nullable(),
  color: z.string().max(100).optional().nullable(),
  material: z.string().max(200).optional().nullable(),
  finish: z.string().max(100).optional().nullable(),
  mountingType: MountingTypeEnum.optional().nullable(),
  numberOfDoors: z
    .number()
    .int("Number of doors must be a whole number")
    .min(1)
    .max(999)
    .optional()
    .nullable(),
  lockType: z.string().max(100).optional().nullable(),
  postalApproved: z.boolean().default(false),
  features: z.array(z.string().max(200)).max(20, "Maximum 20 features").default([]),
  tags: z.array(z.string().max(50)).max(20, "Maximum 20 tags").default([]),
});

export const updateSKUSchema = createSKUSchema.partial().extend({
  id: z.string().min(1, "ID is required"),
});

export const createCategorySchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be 100 characters or less"),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .max(100, "Slug must be 100 characters or less")
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
  description: z.string().max(500).optional().nullable(),
});

export const skuQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  status: SKUStatusEnum.optional(),
  categoryId: z.string().optional(),
  sortBy: z
    .enum(["name", "sku", "retailPrice", "stockQuantity", "createdAt", "updatedAt"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type CreateSKUInput = z.infer<typeof createSKUSchema>;
export type UpdateSKUInput = z.infer<typeof updateSKUSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type SKUQueryInput = z.infer<typeof skuQuerySchema>;
