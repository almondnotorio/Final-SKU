"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { Upload, X, Star, Loader2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface UploadedImage {
  id?: string;
  url: string;
  alt?: string;
  isPrimary?: boolean;
  order?: number;
}

interface ImageUploadProps {
  value: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  maxImages?: number;
  disabled?: boolean;
}

export function ImageUpload({
  value,
  onChange,
  maxImages = 10,
  disabled = false,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      if (value.length + files.length > maxImages) {
        toast.error(`Maximum ${maxImages} images allowed`);
        return;
      }

      const validFiles = files.filter((f) => {
        if (!f.type.startsWith("image/")) {
          toast.error(`${f.name} is not an image file`);
          return false;
        }
        if (f.size > 10 * 1024 * 1024) {
          toast.error(`${f.name} exceeds 10MB limit`);
          return false;
        }
        return true;
      });

      if (validFiles.length === 0) return;

      setUploading(true);
      try {
        const uploaded: UploadedImage[] = [];
        for (const file of validFiles) {
          const formData = new FormData();
          formData.append("file", file);
          const res = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Upload failed");
          }
          const data = await res.json();
          uploaded.push({
            url: data.data.url,
            alt: file.name.replace(/\.[^.]+$/, ""),
            isPrimary: false,
          });
        }
        const newImages = [...value, ...uploaded];
        // If no primary set, make first one primary
        if (!newImages.some((img) => img.isPrimary) && newImages.length > 0) {
          newImages[0].isPrimary = true;
        }
        onChange(newImages);
        toast.success(`${uploaded.length} image(s) uploaded`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [value, onChange, maxImages]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    uploadFiles(files);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    uploadFiles(files);
  };

  const removeImage = (index: number) => {
    const newImages = value.filter((_, i) => i !== index);
    if (newImages.length > 0 && !newImages.some((img) => img.isPrimary)) {
      newImages[0].isPrimary = true;
    }
    onChange(newImages);
  };

  const setPrimary = (index: number) => {
    const newImages = value.map((img, i) => ({
      ...img,
      isPrimary: i === index,
    }));
    onChange(newImages);
  };

  const moveImage = (from: number, to: number) => {
    if (to < 0 || to >= value.length) return;
    const newImages = [...value];
    const [moved] = newImages.splice(from, 1);
    newImages.splice(to, 0, moved);
    onChange(newImages);
  };

  return (
    <div className="space-y-3">
      {/* Upload zone */}
      {value.length < maxImages && (
        <label
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 transition-colors",
            dragOver
              ? "border-primary bg-primary/5"
              : "border-input hover:border-primary/50 hover:bg-accent/30",
            (disabled || uploading) && "cursor-not-allowed opacity-60"
          )}
        >
          <input
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={handleFileInput}
            disabled={disabled || uploading}
          />
          {uploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Upload className="h-6 w-6 text-primary" />
            </div>
          )}
          <div className="text-center">
            <p className="text-sm font-medium">
              {uploading ? "Uploading..." : "Click to upload or drag and drop"}
            </p>
            <p className="text-xs text-muted-foreground">
              PNG, JPG, WEBP up to 10MB · {value.length}/{maxImages} images
            </p>
          </div>
        </label>
      )}

      {/* Image grid */}
      {value.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {value.map((image, index) => (
            <div
              key={image.url + index}
              className="group relative aspect-square overflow-hidden rounded-lg border bg-muted"
            >
              <Image
                src={image.url}
                alt={image.alt || `Image ${index + 1}`}
                fill
                className="object-cover transition-transform group-hover:scale-105"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              />
              {/* Overlay */}
              <div className="absolute inset-0 flex flex-col items-end justify-between bg-black/0 p-1.5 transition-colors group-hover:bg-black/30">
                {/* Primary badge */}
                {image.isPrimary && (
                  <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                    Primary
                  </span>
                )}
                {!image.isPrimary && (
                  <span className="invisible h-4" />
                )}
                {/* Actions */}
                <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  {!image.isPrimary && (
                    <button
                      type="button"
                      onClick={() => setPrimary(index)}
                      className="flex h-6 w-6 items-center justify-center rounded-md bg-background/90 text-foreground transition-colors hover:bg-background"
                      title="Set as primary"
                    >
                      <Star className="h-3 w-3" />
                    </button>
                  )}
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => moveImage(index, index - 1)}
                      className="flex h-6 w-6 items-center justify-center rounded-md bg-background/90 text-foreground transition-colors hover:bg-background text-xs font-bold"
                      title="Move left"
                    >
                      ←
                    </button>
                  )}
                  {index < value.length - 1 && (
                    <button
                      type="button"
                      onClick={() => moveImage(index, index + 1)}
                      className="flex h-6 w-6 items-center justify-center rounded-md bg-background/90 text-foreground transition-colors hover:bg-background text-xs font-bold"
                      title="Move right"
                    >
                      →
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="flex h-6 w-6 items-center justify-center rounded-md bg-destructive/90 text-destructive-foreground transition-colors hover:bg-destructive"
                    title="Remove image"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {value.length === 0 && !uploading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ImageIcon className="h-3.5 w-3.5" />
          <span>No images uploaded yet</span>
        </div>
      )}
    </div>
  );
}
