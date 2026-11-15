import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api";
import { cloudinary } from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";
import { toVideoDto } from "@/lib/videos";
import { firstError, updateVideoSchema } from "@/lib/validation";

type RouteContext = { params: Promise<{ id: string }> };

// PATCH /api/videos/:id   body: { title, description }
// Only the owner can edit.
export async function PATCH(request: Request, { params }: RouteContext) {
  const { userId } = await auth();
  if (!userId) return errorResponse("Unauthorized", 401);

  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = updateVideoSchema.safeParse(body);
  if (!parsed.success) return errorResponse(firstError(parsed.error), 400);

  try {
    const existing = await prisma.video.findUnique({ where: { id } });
    if (!existing) return errorResponse("Video not found", 404);
    if (existing.userId !== userId) {
      return errorResponse("You can only edit your own videos", 403);
    }

    const updated = await prisma.video.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json(toVideoDto(updated, userId));
  } catch (error) {
    console.error("[videos] update failed:", error);
    return errorResponse("Could not update the video", 500);
  }
}

// DELETE /api/videos/:id
// Only the owner can delete. We remove the file from Cloudinary first and the
// database row second: if Cloudinary fails, the row stays and the user can retry
// (no orphan file that we pay for but cannot see).
export async function DELETE(_request: Request, { params }: RouteContext) {
  const { userId } = await auth();
  if (!userId) return errorResponse("Unauthorized", 401);

  const { id } = await params;

  try {
    const existing = await prisma.video.findUnique({ where: { id } });
    if (!existing) return errorResponse("Video not found", 404);
    if (existing.userId !== userId) {
      return errorResponse("You can only delete your own videos", 403);
    }

    const result = await cloudinary.uploader.destroy(existing.publicId, {
      resource_type: "video",
      invalidate: true,
    });

    // "not found" is fine: the file is already gone
    if (result.result !== "ok" && result.result !== "not found") {
      return errorResponse("Could not delete the video file", 502);
    }

    await prisma.video.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[videos] delete failed:", error);
    return errorResponse("Could not delete the video", 500);
  }
}
