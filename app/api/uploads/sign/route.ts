import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api";
import {
  cloudinary,
  isCloudinaryConfigured,
  VIDEO_UPLOAD_TRANSFORMATION,
} from "@/lib/cloudinary";
import { userFolder } from "@/lib/ownership";
import { firstError, signUploadSchema } from "@/lib/validation";

// POST /api/uploads/sign   body: { "type": "video" | "image" }
//
// The browser uploads big files straight to Cloudinary (not through our server).
// Cloudinary only accepts the upload if it carries a signature made with our secret key.
// This route makes that signature: a short-lived permission slip for ONE upload.
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return errorResponse("Unauthorized", 401);

  if (!isCloudinaryConfigured()) {
    return errorResponse("Cloudinary is not configured on the server", 500);
  }

  const body = await request.json().catch(() => null);
  const parsed = signUploadSchema.safeParse(body);
  if (!parsed.success) return errorResponse(firstError(parsed.error), 400);

  const { type } = parsed.data;
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
  const apiKey = process.env.CLOUDINARY_API_KEY!;
  const apiSecret = process.env.CLOUDINARY_API_SECRET!;

  // These values are part of the signature, so the browser cannot change them:
  // it cannot upload to another folder or skip the compression.
  const timestamp = Math.round(Date.now() / 1000);
  const folder = userFolder(userId, type);
  const paramsToSign: Record<string, string | number> = { folder, timestamp };
  if (type === "video") {
    paramsToSign.transformation = VIDEO_UPLOAD_TRANSFORMATION;
  }

  const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

  return NextResponse.json({
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/${type}/upload`,
    apiKey,
    timestamp,
    signature,
    folder,
    transformation: paramsToSign.transformation ?? null,
  });
}
