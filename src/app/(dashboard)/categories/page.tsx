"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Tag, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-field";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { slugify } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  _count: { skus: number };
}

interface CategoryForm {
  name: string;
  slug: string;
  description: string;
}

const DEFAULT_FORM: CategoryForm = { name: "", slug: "", description: "" };

export default function CategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CategoryForm>(DEFAULT_FORM);
  const [errors, setErrors] = useState<Partial<CategoryForm>>({});

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      if (data.success) setCategories(data.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const openCreate = () => {
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setErrors({});
    setDialogOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditingId(cat.id);
    setForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description ?? "",
    });
    setErrors({});
    setDialogOpen(true);
  };

  const validate = (): boolean => {
    const errs: Partial<CategoryForm> = {};
    if (!form.name.trim() || form.name.length < 2) errs.name = "Name must be at least 2 characters";
    if (!form.slug.trim() || !/^[a-z0-9-]+$/.test(form.slug)) {
      errs.slug = "Slug must be lowercase letters, numbers, and hyphens only";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const url = editingId ? `/api/categories/${editingId}` : "/api/categories";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error ?? "Failed to save category");
        return;
      }
      toast.success(editingId ? "Category updated" : "Category created");
      setDialogOpen(false);
      fetchCategories();
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error ?? "Failed to delete");
        return;
      }
      toast.success("Category deleted");
      fetchCategories();
      router.refresh();
    } finally {
      setDeleting(null);
    }
  };

  return (
    <>
      <Header
        title="Categories"
        description="Organize your signage products into categories"
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" /> New Category
          </Button>
        }
      />

      <div className="p-6">
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl border bg-muted" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-xl border bg-card py-20 text-center text-muted-foreground">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Tag className="h-6 w-6" />
            </div>
            <div>
              <p className="font-medium">No categories yet</p>
              <p className="text-sm">Create your first category to organize SKUs</p>
            </div>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> Create Category
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 animate-fade-in">
            {categories.map((cat) => (
              <Card key={cat.id} className="group relative overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Tag className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{cat.name}</p>
                        <p className="text-xs text-muted-foreground">/{cat.slug}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEdit(cat)}
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(cat.id)}
                        disabled={deleting === cat.id || cat._count.skus > 0}
                        title={
                          cat._count.skus > 0
                            ? `Cannot delete: ${cat._count.skus} SKUs assigned`
                            : "Delete"
                        }
                        className="text-destructive hover:text-destructive"
                      >
                        {deleting === cat.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                  {cat.description && (
                    <p className="mt-2.5 text-xs text-muted-foreground line-clamp-2">
                      {cat.description}
                    </p>
                  )}
                  <div className="mt-3 border-t pt-2.5">
                    <span className="text-xs text-muted-foreground">
                      {cat._count.skus} SKU{cat._count.skus !== 1 ? "s" : ""}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Category" : "New Category"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <FormField label="Name" htmlFor="cat-name" error={errors.name} required>
              <Input
                id="cat-name"
                value={form.name}
                onChange={(e) => {
                  setForm((f) => ({
                    ...f,
                    name: e.target.value,
                    slug: editingId ? f.slug : slugify(e.target.value),
                  }));
                }}
                placeholder="e.g. Outdoor Signages"
                error={errors.name}
              />
            </FormField>
            <FormField
              label="Slug"
              htmlFor="cat-slug"
              error={errors.slug}
              hint="URL-friendly identifier (auto-generated)"
              required
            >
              <Input
                id="cat-slug"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase() }))}
                placeholder="e.g. outdoor-signages"
                className="font-mono"
                error={errors.slug}
              />
            </FormField>
            <FormField label="Description" htmlFor="cat-desc">
              <Textarea
                id="cat-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Optional category description..."
                rows={3}
              />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="animate-spin" />}
              {editingId ? "Save Changes" : "Create Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
