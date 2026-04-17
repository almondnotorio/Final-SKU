"use client";

import { useState } from "react";
import { Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface GalleryImage {
  id: string;
  url: string;
  alt: string | null;
  isPrimary: boolean;
}

interface SKUImageGalleryProps {
  images: GalleryImage[];
  skuName: string;
}

export function SKUImageGallery({ images, skuName }: SKUImageGalleryProps) {
  const defaultImage = images.find((i) => i.isPrimary) ?? images[0] ?? null;
  const [selected, setSelected] = useState<GalleryImage | null>(defaultImage);

  return (
    <div className="space-y-3">
      {/* Main preview */}
      <div className="overflow-hidden rounded-xl border bg-muted">
        <div className="relative aspect-square flex items-center justify-center">
          {selected ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={selected.url}
              alt={selected.alt ?? skuName}
              className="w-full h-full object-contain"
            />
          ) : (
            <Package className="h-16 w-16 text-muted-foreground/30" />
          )}
        </div>
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-2">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setSelected(img)}
              className={cn(
                "aspect-square overflow-hidden rounded-lg border bg-muted transition-all flex items-center justify-center",
                selected?.id === img.id
                  ? "ring-2 ring-primary ring-offset-1"
                  : "opacity-60 hover:opacity-100"
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={img.alt ?? `Image ${i + 1}`}
                className="w-full h-full object-contain"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
