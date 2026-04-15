import type { SKU, Category, Image, SKUStatus, MountingType } from "@prisma/client";

export type { SKUStatus, MountingType };

export type SKUWithRelations = SKU & {
  category: Category;
  images: Image[];
};

export type SKUListItem = Pick<
  SKU,
  | "id"
  | "sku"
  | "name"
  | "retailPrice"
  | "wholesalePrice"
  | "status"
  | "stockQuantity"
  | "thumbnail"
  | "color"
  | "createdAt"
  | "updatedAt"
> & {
  category: Pick<Category, "id" | "name">;
};

export interface PaginatedResponse<T> {
  items: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DashboardStats {
  totalSKUs: number;
  activeSKUs: number;
  outOfStock: number;
  discontinued: number;
  totalCategories: number;
  recentSKUs: SKUListItem[];
}

export type ViewMode = "grid" | "list";

export interface FilterState {
  search: string;
  status: SKUStatus | "";
  categoryId: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
}
