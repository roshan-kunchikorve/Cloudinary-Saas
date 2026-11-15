import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export { cloudinary };

// Cloudinary compresses the video while it saves it: automatic quality, mp4 format.
export const VIDEO_UPLOAD_TRANSFORMATION = "f_mp4,q_auto";

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );
}

// Cloudinary's Node SDK rejects with { error: { http_code, message } }.
// This reads the HTTP status out of that shape (for example 404 = not found).
export function cloudinaryStatus(error: unknown): number | undefined {
  const e = error as { http_code?: number; error?: { http_code?: number } };
  return e?.error?.http_code ?? e?.http_code;
}
