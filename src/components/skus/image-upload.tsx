"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Upload, X, Star, Loader2, ImageIcon, AlertCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface UploadedImage {
  id?: string;
  url: string;
  alt?: string;
  isPrimary?: boolean;
  order?: number;
}

interface PendingPreview {
  previewUrl: string;
  file: File;
}

interface ImageUploadProps {
  value: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  maxImages?: number;
  disabled?: boolean;
}

interface UploadError {
  title: string;
  message: string;
  hint: string;
}

function GridImage({ src, alt }: { src: string; alt: string }) {
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
        }}
        className={cn(
          "object-contain transition-transform group-hover:scale-105",
          isWide ? "w-1/2 h-auto" : "w-full h-full"
        )}
      />
    </div>
  );
}

export function ImageUpload({
  value,
  onChange,
  maxImages = 10,
  disabled = false,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<UploadError | null>(null);
  const [pendingPreviews, setPendingPreviews] = useState<PendingPreview[]>([]);
  const objectUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const clearError = () => setUploadError(null);

  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      setUploadError(null);

      if (value.length + files.length > maxImages) {
        const err: UploadError = {
          title: "Too many images",
          message: `You can only upload up to ${maxImages} images per SKU.`,
          hint: `Remove some existing images first, then try again.`,
        };
        setUploadError(err);
        toast.error(err.title, { description: err.hint });
        return;
      }

      const validFiles = files.filter((f) => {
        if (!f.type.startsWith("image/")) {
          const err: UploadError = {
            title: "Unsupported file type",
            message: `"${f.name}" is not an image file.`,
            hint: "Only PNG, JPG, JPEG, and WEBP files are supported. Convert your file and try again.",
          };
          setUploadError(err);
          toast.error(err.title, { description: err.hint });
          return false;
        }
        if (f.size > 10 * 1024 * 1024) {
          const sizeMB = (f.size / (1024 * 1024)).toFixed(1);
          const err: UploadError = {
            title: "File too large",
            message: `"${f.name}" is ${sizeMB}MB — the limit is 10MB.`,
            hint: "Compress or resize the image using a tool like Squoosh, TinyPNG, or your photo editor, then try again.",
          };
          setUploadError(err);
          toast.error(err.title, { description: err.hint });
          return false;
        }
        return true;
      });

      if (validFiles.length === 0) return;

      // Create local previews immediately
      const previews: PendingPreview[] = validFiles.map((file) => {
        const previewUrl = URL.createObjectURL(file);
        objectUrlsRef.current.push(previewUrl);
        return { previewUrl, file };
      });
      setPendingPreviews(previews);
      setUploading(true);

      try {
        const uploaded: UploadedImage[] = [];
        for (const { file, previewUrl } of previews) {
          const formData = new FormData();
          formData.append("file", file);
          const res = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            const status = res.status;
            let err: UploadError;
            if (status === 413) {
              err = {
                title: "File too large for server",
                message: "The server rejected the file because it exceeds the allowed size.",
                hint: "Compress or resize the image below 10MB and try again.",
              };
            } else if (status === 401 || status === 403) {
              err = {
                title: "Upload not authorized",
                message: "You don't have permission to upload images.",
                hint: "Make sure you're signed in and your account has upload access.",
              };
            } else if (status >= 500) {
              err = {
                title: "Server error",
                message: "The upload service is currently unavailable.",
                hint: "Wait a moment and try again. If the issue persists, contact support.",
              };
            } else {
              err = {
                title: "Upload failed",
                message: data.error || `Unexpected error (${status}).`,
                hint: "Try again. If the problem continues, check your internet connection or contact support.",
              };
            }
            URL.revokeObjectURL(previewUrl);
            setUploadError(err);
            toast.error(err.title, { description: err.hint });
            setPendingPreviews([]);
            return;
          }
          const data = await res.json();
          uploaded.push({
            url: data.data.url,
            alt: file.name.replace(/\.[^.]+$/, ""),
            isPrimary: false,
          });
          URL.revokeObjectURL(previewUrl);
        }
        const newImages = [...value, ...uploaded];
        if (!newImages.some((img) => img.isPrimary) && newImages.length > 0) {
          newImages[0].isPrimary = true;
        }
        onChange(newImages);
        toast.success(`${uploaded.length} image(s) uploaded successfully`);
      } catch {
        const err: UploadError = {
          title: "Network error",
          message: "The upload could not be completed.",
          hint: "Check your internet connection and try again. If the problem persists, try a different browser.",
        };
        setUploadError(err);
        toast.error(err.title, { description: err.hint });
      } finally {
        setUploading(false);
        setPendingPreviews([]);
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
    setUploadError(null);
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
      {/* Inline error alert */}
      {uploadError && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/8 px-4 py-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div className="flex-1 space-y-0.5">
            <p className="text-sm font-semibold text-destructive">{uploadError.title}</p>
            <p className="text-xs text-destructive/80">{uploadError.message}</p>
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">What to do:</span> {uploadError.hint}
            </p>
          </div>
          <button
            type="button"
            onClick={clearError}
            className="shrink-0 text-destructive/60 hover:text-destructive transition-colors"
            aria-label="Dismiss error"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

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
      {(value.length > 0 || pendingPreviews.length > 0) && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {value.map((image, index) => (
            <div
              key={image.url + index}
              className="group relative aspect-square overflow-hidden rounded-lg border bg-muted"
            >
              <GridImage src={image.url} alt={image.alt || `Image ${index + 1}`} />
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
          {/* Pending upload previews */}
          {pendingPreviews.map(({ previewUrl, file }) => (
            <div
              key={previewUrl}
              className="relative aspect-square overflow-hidden rounded-lg border bg-muted"
            >
              <GridImage src={previewUrl} alt={file.name} />
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <Loader2 className="h-6 w-6 animate-spin text-white" />
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
