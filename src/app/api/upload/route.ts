import { auth } from "@clerk/nextjs/server";
import { put } from "@vercel/blob";
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/api-response";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return unauthorizedResponse();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return errorResponse("No file provided", 400);
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return errorResponse(
        `Invalid file type. Allowed: ${ALLOWED_TYPES.join(", ")}`,
        415
      );
    }

    if (file.size > MAX_SIZE) {
      return errorResponse("File size exceeds 10MB limit", 413);
    }

    // Sanitize filename
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const safeName = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const blob = await put(safeName, file, {
      access: "public",
      contentType: file.type,
    });

    return successResponse({
      url: blob.url,
      pathname: blob.pathname,
      contentType: blob.contentType,
      size: file.size,
    });
  } catch (err) {
    console.error("[POST /api/upload]", err);
    return errorResponse("Upload failed. Please try again.", 500);
  }
}
