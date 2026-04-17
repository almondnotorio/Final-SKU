"use client";

import { useState, useRef } from "react";
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

const ZOOM = 2.5;
const LENS_SIZE = 140;

interface LensPos {
  x: number;
  y: number;
  bgX: number;
  bgY: number;
}

function MagnifiableImage({ src, alt }: { src: string; alt: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [lens, setLens] = useState<LensPos | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Clamp lens center so it never exceeds container bounds
    const lensHalf = LENS_SIZE / 2;
    const clampedX = Math.max(lensHalf, Math.min(x, rect.width - lensHalf));
    const clampedY = Math.max(lensHalf, Math.min(y, rect.height - lensHalf));

    // Background position: shift the zoomed image so the hovered point stays centered
    const bgX = -(clampedX * ZOOM - lensHalf);
    const bgY = -(clampedY * ZOOM - lensHalf);

    setLens({ x: clampedX, y: clampedY, bgX, bgY });
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full cursor-crosshair"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setLens(null)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="w-full h-full object-contain" />

      {lens && (
        <div
          className="absolute rounded-full border-2 border-primary shadow-xl pointer-events-none z-10 overflow-hidden"
          style={{
            width: LENS_SIZE,
            height: LENS_SIZE,
            left: lens.x - LENS_SIZE / 2,
            top: lens.y - LENS_SIZE / 2,
            backgroundImage: `url(${src})`,
            backgroundSize: `${100 * ZOOM}%`,
            backgroundPosition: `${lens.bgX}px ${lens.bgY}px`,
            backgroundRepeat: "no-repeat",
          }}
        />
      )}
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
