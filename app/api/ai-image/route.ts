import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { analyzeImage, isAiConfigured } from "@/lib/ai";
import { aiUsageLast24h, dailyAiLimit } from "@/lib/ai-quota";
import { errorResponse } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { analyzeImageSchema, firstError } from "@/lib/validation";

// GET /api/ai-image
// Tells the page if AI is set up and how many analyses the user has left today.
export async function GET() {
  const { userId } = await auth();
  if (!userId) return errorResponse("Unauthorized", 401);

  const limit = dailyAiLimit();
  const used = await aiUsageLast24h(userId);

  return NextResponse.json({
    configured: isAiConfigured(),
    limit,
    remaining: Math.max(0, limit - used),
  });
}

// POST /api/ai-image   body: { image: "data:image/png;base64,...", prompt: "..." }
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return errorResponse("Unauthorized", 401);

  // The app works without an AI key. This feature just switches itself off.
  if (!isAiConfigured()) {
    return errorResponse("AI analysis is not set up on this server yet", 503);
  }

  const body = await request.json().catch(() => null);
  const parsed = analyzeImageSchema.safeParse(body);
  if (!parsed.success) return errorResponse(firstError(parsed.error), 400);

  // Daily limit per user: protects our AI bill
  const limit = dailyAiLimit();
  const used = await aiUsageLast24h(userId);
  if (used >= limit) {
    return NextResponse.json(
      {
        error: `Daily limit reached (${limit} analyses per 24 hours). Try again later.`,
        remaining: 0,
      },
      { status: 429 },
    );
  }

  try {
    const result = await analyzeImage(parsed.data.image, parsed.data.prompt);

    // Count it only after it worked
    await prisma.aiGeneration.create({ data: { userId } });

    return NextResponse.json({ result, remaining: limit - used - 1 });
  } catch (error) {
    console.error("[ai-image] failed:", error);

    // 429 from OpenAI means no credit left or too many requests
    if ((error as { status?: number }).status === 429) {
      return errorResponse(
        "The AI provider has no credit or is busy right now. Try again later.",
        503,
      );
    }

    return errorResponse("The AI service failed. Please try again.", 502);
  }
}
