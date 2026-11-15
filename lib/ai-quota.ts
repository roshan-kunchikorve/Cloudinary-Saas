import { prisma } from "./prisma";

const DEFAULT_DAILY_LIMIT = 5;

// How many AI analyses one user may run in 24 hours (change with AI_DAILY_LIMIT).
export function dailyAiLimit(): number {
  const fromEnv = Number(process.env.AI_DAILY_LIMIT);
  return Number.isInteger(fromEnv) && fromEnv > 0 ? fromEnv : DEFAULT_DAILY_LIMIT;
}

export async function aiUsageLast24h(userId: string): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return prisma.aiGeneration.count({
    where: { userId, createdAt: { gte: since } },
  });
}
