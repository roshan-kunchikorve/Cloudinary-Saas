import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { db } from "@/prisma/db";

interface CloudinaryUploadResult {
  public_id: string;
  bytes: number;
  duration?: number;
  [key: string]: any;
}

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: NextRequest) {
  try {
    if (
      !process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      return NextResponse.json(
        { error: "Cloudinary credentials not found" },
        { status: 500 },
      );
    }

    const formData = await request.formData();

    const file = formData.get("file");
    const titleValue = formData.get("title");
    const descriptionValue = formData.get("description");
    const originalSizeValue = formData.get("originalSize");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "A video file is required" },
        { status: 400 },
      );
    }

    if (
      typeof titleValue !== "string" ||
      !titleValue.trim() ||
      typeof originalSizeValue !== "string" ||
      !originalSizeValue.trim()
    ) {
      return NextResponse.json(
        { error: "Title and originalSize are required" },
        { status: 400 },
      );
    }

    const title = titleValue.trim();
    const description =
      typeof descriptionValue === "string" && descriptionValue.trim()
        ? descriptionValue.trim()
        : null;

    const originalSize = Number(originalSizeValue);

    if (!Number.isFinite(originalSize) || originalSize < 0) {
      return NextResponse.json(
        { error: "Invalid originalSize" },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const result = await new Promise<CloudinaryUploadResult>(
      (resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: "video",
            folder: "video-uploads",
            transformation: [{ quality: "auto", fetch_format: "mp4" }],
          },
          (error, uploadResult) => {
            if (error) {
              reject(error);
            } else if (!uploadResult) {
              reject(new Error("Cloudinary returned no upload result"));
            } else {
              resolve(uploadResult as CloudinaryUploadResult);
            }
          },
        );

        uploadStream.end(buffer);
      },
    );

    const video = await db.orm.public.Video.create({
      title,
      description,
      publicId: result.public_id,
      originalSize: String(originalSize),
      compressedSize: String(result.bytes),
      duration: result.duration ?? 0,
    });

    return NextResponse.json(video, { status: 201 });
  } catch (error) {
    console.error("Upload video failed:", error);

    return NextResponse.json({ error: "Upload video failed" }, { status: 500 });
  }
}
