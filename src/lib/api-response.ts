import { NextResponse } from "next/server";

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: Record<string, string[]>;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function successResponse<T>(
  data: T,
  meta?: ApiResponse["meta"],
  status = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data, ...(meta && { meta }) }, { status });
}

export function errorResponse(
  error: string,
  status = 400,
  errors?: Record<string, string[]>
): NextResponse<ApiResponse> {
  return NextResponse.json(
    { success: false, error, ...(errors && { errors }) },
    { status }
  );
}

export function unauthorizedResponse(): NextResponse<ApiResponse> {
  return errorResponse("Unauthorized. Please sign in.", 401);
}

export function notFoundResponse(resource = "Resource"): NextResponse<ApiResponse> {
  return errorResponse(`${resource} not found.`, 404);
}

export function validationErrorResponse(
  errors: Record<string, string[]>
): NextResponse<ApiResponse> {
  return errorResponse("Validation failed.", 422, errors);
}
