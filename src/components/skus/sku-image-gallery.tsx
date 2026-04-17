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

function MainImage({ src, alt }: { src: string; alt: string }) {
  const [isWide, setIsWide] = useState(false);

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-muted">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        onLoad={(e) => {
          const img = e.currentTarget;
          if (img.naturalWidth > img.naturalHeight) setIsWide(true);
          else setIsWide(false);
        }}
        className={cn(
          "object-contain transition-all duration-200",
          isWide ? "w-1/2 h-auto" : "w-full h-full"
        )}
      />
    </div>
  );
}

function ThumbImage({ src, alt }: { src: string; alt: string }) {
  const [isWide, setIsWide] = useState(false);

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        onLoad={(e) => {
          const img = e.currentTarget;
          if (img.naturalWidth > img.naturalHeight) setIsWide(true);
          else setIsWide(false);
        }}
        className={cn(
          "object-contain",
          isWide ? "w-1/2 h-auto" : "w-full h-full"
        )}
      />
    </div>
  );
}

export function SKUImageGallery({ images, skuName }: SKUImageGalleryProps) {
  const defaultImage = images.find((i) => i.isPrimary) ?? images[0] ?? null;
  const [selected, setSelected] = useState<GalleryImage | null>(defaultImage);

  return (
    <div className="space-y-3">
      {/* Main preview */}
      <div className="overflow-hidden rounded-xl border bg-muted">
        <div className="relative aspect-square">
          {selected ? (
            <MainImage src={selected.url} alt={selected.alt ?? skuName} />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Package className="h-16 w-16 text-muted-foreground/30" />
            </div>
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
                "relative aspect-square overflow-hidden rounded-lg border bg-muted transition-all",
                selected?.id === img.id
                  ? "ring-2 ring-primary ring-offset-1"
                  : "opacity-60 hover:opacity-100"
              )}
            >
              <ThumbImage src={img.url} alt={img.alt ?? `Image ${i + 1}`} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
