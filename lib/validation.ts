import { z } from "zod";
import { MAX_VIDEO_SIZE_BYTES, MAX_VIDEO_SIZE_MB } from "./limits";

const title = z
  .string()
  .trim()
  .min(1, "Title is required")
  .max(100, "Title must be 100 characters or less");

// Empty text becomes null so the database stores "no description".
const description = z
  .string()
  .trim()
  .max(300, "Description must be 300 characters or less")
  .nullish()
  .transform((value) => value || null);

// Body of POST /api/videos (called after the browser finished uploading to Cloudinary)
export const createVideoSchema = z.object({
  publicId: z.string().min(1, "publicId is required").max(300),
  title,
  description,
  originalSize: z
    .number()
    .int()
    .positive("originalSize must be a positive number")
    .max(MAX_VIDEO_SIZE_BYTES, `Video must be ${MAX_VIDEO_SIZE_MB} MB or smaller`),
});

// Body of PATCH /api/videos/:id
export const updateVideoSchema = z.object({ title, description });

// Query string of GET /api/videos
export const listVideosSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(24).default(9),
  q: z.string().trim().max(100).optional(),
  mine: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
});

// Body of POST /api/uploads/sign
export const signUploadSchema = z.object({
  type: z.enum(["video", "image"]),
});

// Body of POST /api/ai-image
export const analyzeImageSchema = z.object({
  image: z
    .string()
    .max(6_000_000, "Image is too large")
    .refine(
      (value) => /^data:image\/(png|jpeg|webp);base64,/.test(value),
      "Image must be a PNG, JPEG or WebP",
    ),
  prompt: z
    .string()
    .trim()
    .min(1, "Prompt is required")
    .max(500, "Prompt must be 500 characters or less"),
});

// The first problem found, written for a person to read.
export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid request";
}
