import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { Prisma } from "@/lib/generated/prisma/client";
import { errorResponse } from "@/lib/api";
import { cloudinary, cloudinaryStatus } from "@/lib/cloudinary";
import { ownsPublicId } from "@/lib/ownership";
import { prisma } from "@/lib/prisma";
import { toVideoDto } from "@/lib/videos";
import {
  createVideoSchema,
  firstError,
  listVideosSchema,
} from "@/lib/validation";

// GET /api/videos?page=1&pageSize=9&q=holiday&mine=true
// Public: anyone can browse. "mine=true" needs a login.
export async function GET(request: Request) {
  const { userId } = await auth();

  const query = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = listVideosSchema.safeParse(query);
  if (!parsed.success) return errorResponse(firstError(parsed.error), 400);

  const { page, pageSize, q, mine } = parsed.data;

  if (mine && !userId) return errorResponse("Unauthorized", 401);

  // Build the SQL filter step by step
  const where: Prisma.VideoWhereInput = {};
  if (mine && userId) where.userId = userId;
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }

  try {
    // Two queries in one transaction: this page of videos + the total count
    const [videos, total] = await prisma.$transaction([
      prisma.video.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.video.count({ where }),
    ]);

    return NextResponse.json({
      items: videos.map((video) => toVideoDto(video, userId)),
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch (error) {
    console.error("[videos] list failed:", error);
    return errorResponse("Could not load videos", 500);
  }
}

// POST /api/videos
// Called after the browser finished uploading the video to Cloudinary.
// We do NOT trust what the browser says about the file: we ask Cloudinary.
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return errorResponse("Unauthorized", 401);

  const body = await request.json().catch(() => null);
  const parsed = createVideoSchema.safeParse(body);
  if (!parsed.success) return errorResponse(firstError(parsed.error), 400);

  const { publicId, title, description, originalSize } = parsed.data;

  // The file must be inside this user's own Cloudinary folder
  if (!ownsPublicId(publicId, userId, "video")) {
    return errorResponse("That upload does not belong to you", 403);
  }

  // Ask Cloudinary for the real size and duration
  let resource: { bytes: number; duration?: number };
  try {
    resource = await cloudinary.api.resource(publicId, {
      resource_type: "video",
    });
  } catch (error) {
    if (cloudinaryStatus(error) === 404) {
      return errorResponse("Video not found on Cloudinary", 404);
    }
    console.error("[videos] Cloudinary lookup failed:", error);
    return errorResponse("Could not verify the upload with Cloudinary", 502);
  }

  try {
    const video = await prisma.video.create({
      data: {
        userId,
        title,
        description,
        publicId,
        originalSize,
        compressedSize: resource.bytes,
        duration: resource.duration ?? 0,
      },
    });

    return NextResponse.json(toVideoDto(video, userId), { status: 201 });
  } catch (error) {
    // P2002 = unique constraint failed: this publicId was already saved
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return errorResponse("This video was already saved", 409);
    }
    console.error("[videos] create failed:", error);
    return errorResponse("Could not save the video", 500);
  }
}
