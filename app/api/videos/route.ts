import { NextResponse } from "next/server";
import { db } from "@/prisma/db";

export async function GET() {
  try {
    const videos = await db.orm.public.Video.orderBy((video) =>
      video.createdAt.desc(),
    ).all();

    return NextResponse.json(videos);
  } catch (error) {
    console.error("Error fetching videos:", error);

    return NextResponse.json(
      { error: "Error fetching videos" },
      { status: 500 },
    );
  }
}
 