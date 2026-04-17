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

function MagnifiableImage({ src, alt }: { src: string; alt: string }) {
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setOrigin({ x, y });
  };

  return (
    <div
      className="relative w-full h-full overflow-hidden cursor-zoom-in"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setOrigin(null)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-contain transition-transform duration-100 ease-out will-change-transform"
        style={{
          transform: origin ? "scale(2.5)" : "scale(1)",
          transformOrigin: origin ? `${origin.x}% ${origin.y}%` : "center",
        }}
        draggable={false}
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
        <div className="relative aspect-square flex items-center justify-center">
          {selected ? (
            <MagnifiableImage src={selected.url} alt={selected.alt ?? skuName} />
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
