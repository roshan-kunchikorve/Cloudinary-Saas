import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api";
import { compressionPercent } from "@/lib/format";
import { prisma } from "@/lib/prisma";

// GET /api/videos/stats
// How much space the logged-in user saved with compression.
export async function GET() {
  const { userId } = await auth();
  if (!userId) return errorResponse("Unauthorized", 401);

  try {
    // One SQL query: COUNT and SUM done by the database
    const totals = await prisma.video.aggregate({
      where: { userId },
      _count: { _all: true },
      _sum: { originalSize: true, compressedSize: true },
    });

    const originalBytes = totals._sum.originalSize ?? 0;
    const compressedBytes = totals._sum.compressedSize ?? 0;

    return NextResponse.json({
      videoCount: totals._count._all,
      originalBytes,
      compressedBytes,
      savedBytes: Math.max(0, originalBytes - compressedBytes),
      savedPercent: compressionPercent(originalBytes, compressedBytes),
    });
  } catch (error) {
    console.error("[videos] stats failed:", error);
    return errorResponse("Could not load your stats", 500);
  }
}
